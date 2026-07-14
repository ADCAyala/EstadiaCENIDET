import React, { useState, useEffect } from 'react';
import { parse, SymbolNode } from 'mathjs/number';
import Plot from 'react-plotly.js';

function App() {

  const [expression, setExpression] = useState('sin(x) + cos(y) + sin(z)'); 

  const [detectedVariables, setDetectedVariables] = useState([]);

  const [error, setError] = useState('');

  const [plotData, setPlotData] = useState([]);

  const [showModalOptions, setShowModalOptions] = useState(false);
  const [showModalForm, setShowModalForm] = useState(false);
  const [showModalConfirmCancel, setShowModalConfirmCancel] = useState(false);
  const [showModalWarningCount, setShowModalWarningCount] = useState(false);

  // Copia de trabajo temporal para el formulario emergente
  const [tempVariables, setTempVariables] = useState([]);

  //Diccionario de funciones
  const cenidetMathScope = {
    add: (a, b) => a + b,
    sub: (a, b) => a - b,
    mul: (a, b) => a * b,
    div: (a, b) => a / b,
    sqrt: (a) => Math.sqrt(a),
    min: (a, b) => Math.min(a, b),
    max: (a, b) => Math.max(a, b),
    Add: (a, b) => a + b,
    Sub: (a, b) => a - b,
    Mul: (a, b) => a * b,
    Div: (a, b) => a / b,
    Divide: (a, b) => a / b,
    Norm: (a) => Math.abs(a),
    Sqrt: (a) => Math.sqrt(a),
    MIN: (a, b) => Math.min(a, b),
    MAX: (a, b) => Math.max(a, b)
  };

  const handleProcessGraph = (varsToUse = null) => {
    if (!expression || !expression.trim()) {
      setError('Por favor ingrese una función.');
      setPlotData([]);
      return;
    }

    try {
      setError('');
      const node = parse(expression);
      const compiled = node.compile();
      
      const symbols = [];
      node.traverse((childNode) => {
        if (childNode.isSymbolNode && !childNode.isPointer) {
          const nativeFunctions = [
            'sin', 'cos', 'tan', 'log', 'exp', 'sqrt', 'add', 'sub', 'mul', 'div',
            'Sin', 'Cos', 'Tan', 'Log', 'Exp', 'Sqrt', 'Add', 'Sub', 'Mul', 'Div',
            'acos', 'csc', 'csch', 'norm', 'divide', 'Acos', 'Csc', 'Csch', 'Norm', 'Divide',
            'tanh', 'sinh', 'cosh', 'Tanh', 'Sinh', 'Cosh' // Soporte hiperbólico unificado
          ];
          if (!nativeFunctions.includes(childNode.name) && !symbols.includes(childNode.name)) {
            symbols.push(childNode.name);
          }
        }
      });

      // Usamos las variables del formulario si vienen como argumento, si no las del estado actual
      const currentVars = varsToUse ? varsToUse : symbols.map(varName => {
        const existingVar = detectedVariables.find(v => v.name === varName);
        return existingVar ? existingVar : { 
          name: varName, 
          isConstant: false, 
          min: '-10', 
          max: '10',
          constantValue: '5' 
        };
      });

      const activeAxes = currentVars.filter(v => !v.isConstant);
      const constantFields = currentVars.filter(v => v.isConstant);

      // Guardamos las variables validadas en el estado principal
      setDetectedVariables(currentVars);

      // VALIDACIÓN DE CANTIDAD DE VARIABLES HIPERDIMENSIONALES
      if (activeAxes.length > 2 && !varsToUse) {
        setTempVariables(JSON.parse(JSON.stringify(currentVars))); // Clonar copia limpia
        setShowModalOptions(true);
        return;
      }

      const baseScope = { ...cenidetMathScope };
      constantFields.forEach(c => {
        baseScope[c.name] = c.constantValue === '' || c.constantValue === '-' ? 0 : Number(c.constantValue);
      });

      // GENERACIÓN DE PUNTOS
      if (activeAxes.length === 1) {
        const v1 = activeAxes[0];
        const minVal = v1.min === '' || v1.min === '-' ? -10 : Number(v1.min);
        const maxVal = v1.max === '' || v1.max === '-' ? 10 : Number(v1.max);

        const xValues = [];
        const yValues = [];
        const steps = 100;
        const stepSize = (maxVal - minVal) / steps;

        for (let i = 0; i <= steps; i++) {
          const currentVal = minVal + (i * stepSize);
          xValues.push(currentVal);
          const scope = { ...baseScope, [v1.name]: currentVal };
          yValues.push(compiled.evaluate(scope));
        }

        setPlotData([
          {
            x: xValues,
            y: yValues,
            type: 'scatter',
            mode: 'lines',
            line: { color: '#1B396A', width: 3 } 
          }
        ]);

      } else if (activeAxes.length === 2) {
        const v1 = activeAxes[0];
        const v2 = activeAxes[1];
        
        const minX = v1.min === '' || v1.min === '-' ? -10 : Number(v1.min);
        const maxX = v1.max === '' || v1.max === '-' ? 10 : Number(v1.max);
        const minY = v2.min === '' || v2.min === '-' ? -10 : Number(v2.min);
        const maxY = v2.max === '' || v2.max === '-' ? 10 : Number(v2.max);

        const xValues = [];
        const yValues = [];
        const zValues = [];
        
        const steps = 30;
        const stepX = (maxX - minX) / steps;
        const stepY = (maxY - minY) / steps;

        for (let i = 0; i <= steps; i++) xValues.push(minX + (i * stepX));
        for (let j = 0; j <= steps; j++) yValues.push(minY + (j * stepY));

        for (let j = 0; j <= steps; j++) {
          const row = [];
          for (let i = 0; i <= steps; i++) {
            const scope = { ...baseScope, [v1.name]: xValues[i], [v2.name]: yValues[j] };
            row.push(compiled.evaluate(scope));
          }
          zValues.push(row);
        }

        setPlotData([
          {
            x: xValues,
            y: yValues,
            z: zValues,
            type: 'surface',
            colorscale: 'Viridis',
            showscale: false
          }
        ]);
      } else {
        setPlotData([]);
      }

    } catch (err) {
      setError('La expresión escrita no puede ser leída.');
      setPlotData([]);
    }
  };

  const handleVariableChange = (name, field, value) => {
    setDetectedVariables(prev =>
      prev.map(v => v.name === name ? { ...v, [field]: value } : v)
    );
  };
  const toggleVariableMode = (name) => {
    setDetectedVariables(prev =>
      prev.map(v => v.name === name ? { ...v, isConstant: !v.isConstant } : v)
    );
  };

  const handleAcceptFormModal = () => {
    const activeAxes = tempVariables.filter(v => !v.isConstant);
    
    if (activeAxes.length === 0 || activeAxes.length > 2) {
      setShowModalWarningCount(true);
    } else {
      setShowModalForm(false);
      handleProcessGraph(tempVariables);
    }
  };

  const handleOpenFormModal = () => {
    setShowModalOptions(false);
    setShowModalForm(true);
  };

  const handleCancelFormModal = () => {
    setShowModalConfirmCancel(true);
  };

  const handleConfirmCancelSÍ = () => {
    setShowModalConfirmCancel(false);
    setShowModalForm(false);
    handleProcessGraph(); 
  };

  const handleWarningCountSÍ = () => {
    setShowModalWarningCount(false);
    setShowModalForm(false);
    handleProcessGraph(tempVariables);
  };

  const handleTempVariableChange = (name, field, value) => {
    setTempVariables(prev =>
      prev.map(v => v.name === name ? { ...v, [field]: value } : v)
    );
  };

  const toggleTempVariableMode = (name) => {
    setTempVariables(prev =>
      prev.map(v => v.name === name ? { ...v, isConstant: !v.isConstant } : v)
    );
  };

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', padding: '20px', maxWidth: '1150px', margin: '0 auto' }}>
      <header style={{ borderBottom: '4px solid #1B396A', paddingBottom: '10px', marginBottom: '20px' }}>
        <h1 style={{ color: '#333', margin: 0 }}>GenMath PWA - CENIDET</h1>
        <p style={{ color: '#666', margin: '5px 0 0 0' }}>Avance</p>
      </header>

      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        
        {/* PANEL IZQUIERDO: CONTROLES */}
        <div style={{ flex: '1', minWidth: '320px', background: '#f8f9fa', padding: '20px', borderRadius: '8px', border: '1px solid #e9ecef' }}>
          <h3 style={{ marginTop: 0, color: '#1B396A' }}>Configuración</h3>
          
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>
              Expresión del Algoritmo:
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={expression}
                onChange={(e) => setExpression(e.target.value)}
                style={{ flex: 1, padding: '10px', fontSize: '16px', borderRadius: '4px', border: '1px solid #ced4da', boxSizing: 'border-box' }}
                placeholder="Ej. add(div(1, x), mul(3, y))"
              />
              <button
                onClick={() => handleProcessGraph()}
                style={{ padding: '10px 16px', backgroundColor: '#1B396A', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                Graficar
              </button>
            </div>
            {error && <p style={{ color: '#dc3545', fontSize: '13px', marginTop: '5px', fontWeight: 'bold' }}>{error}</p>}
          </div>

          <div>
<h4 style={{ marginBottom: '10px' }}>Mapeo Dinámico de Variables</h4>
{detectedVariables.length === 0 ? (
  <p style={{ color: '#6c757d', fontStyle: 'italic' }}>Introduzca una función.</p>
) : (
  <>
    {/* PRIMERO: Variables en Modo Gráfico */}
    {detectedVariables.filter(v => !v.isConstant).map((variable) => (
      <div key={variable.name} style={{ background: '#fff', padding: '12px', borderRadius: '6px', marginBottom: '12px', border: '1px solid #dee2e6' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span>Variable: <span style={{ color: '#1B396A', fontSize: '18px', fontWeight: 'bold' }}>{variable.name}</span></span>
          <button 
            onClick={() => toggleVariableMode(variable.name)}
            style={{ padding: '4px 8px', fontSize: '11px', textTransform: 'uppercase', fontWeight: 'bold', cursor: 'pointer', borderRadius: '4px', border: '1px solid', backgroundColor: '#248165', color: '#fff' }}
          >
            Valor Gráfico
          </button>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: '11px', color: '#495057' }}>Mínimo:</label>
            <input type="number" step="1" value={variable.min} onChange={(e) => handleVariableChange(variable.name, 'min', e.target.value)} style={{ width: '100%', padding: '6px', boxSizing: 'border-box' }} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: '11px', color: '#495057' }}>Máximo:</label>
            <input type="number" step="1" value={variable.max} onChange={(e) => handleVariableChange(variable.name, 'max', e.target.value)} style={{ width: '100%', padding: '6px', boxSizing: 'border-box' }} />
          </div>
        </div>
      </div>
    ))}

    {/* SEGUNDO: Variables en Modo Constante */}
    {detectedVariables.filter(v => v.isConstant).map((variable) => (
      <div key={variable.name} style={{ background: '#fff', padding: '12px', borderRadius: '6px', marginBottom: '12px', border: '1px solid #dee2e6' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span>Variable: <span style={{ color: '#1B396A', fontSize: '18px', fontWeight: 'bold' }}>{variable.name}</span></span>
          <button 
            onClick={() => toggleVariableMode(variable.name)}
            style={{ padding: '4px 8px', fontSize: '11px', textTransform: 'uppercase', fontWeight: 'bold', cursor: 'pointer', borderRadius: '4px', border: '1px solid', backgroundColor: '#6c757d', color: '#fff' }}
          >
            Valor Constante
          </button>
        </div>
        <div>
          <label style={{ fontSize: '11px', color: '#495057', display: 'block', marginBottom: '4px' }}>Asignar Valor Constante Fijo:</label>
          <input type="text" value={variable.constantValue} onChange={(e) => handleVariableChange(variable.name, 'constantValue', e.target.value)} style={{ width: '100%', padding: '6px', boxSizing: 'border-box' }} placeholder="Ej. 5" />
        </div>
      </div>
    ))}
  </>
)}</div>
        </div>

        {/* PANEL DERECHO: LIENZO GRÁFICO */}
        <div style={{ flex: '1.5', minWidth: '400px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
          
<div style={{ background: '#e9ecef', padding: '12px 20px', borderRadius: '6px', fontFamily: 'monospace', fontSize: '15px', borderLeft: '5px solid #1B396A' }}>
  <strong>Función Algebraica:</strong> f = {expression || 'Sin expresión'} <br />
  <strong>Ejes Proyectados:</strong> {detectedVariables.filter(v => !v.isConstant).map(v => v.name).join(', ') || 'Ninguno'}
</div>

          <div style={{ 
            width: '100%', 
            minHeight: '460px', 
            background: '#ffffff', 
            borderRadius: '8px', 
            border: '1px solid #dee2e6',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            overflow: 'hidden'
          }}>
            {plotData.length > 0 ? (
              <Plot
                data={plotData}
                layout={{
                  autosize: true,
                  width: 620,
                  height: 450,
                  margin: { l: 40, r: 40, b: 40, t: 20 },
                  scene: {
                    xaxis: { title: detectedVariables.filter(v=>!v.isConstant)[0]?.name || 'Eje X' },
                    yaxis: { title: detectedVariables.filter(v=>!v.isConstant)[1]?.name || 'Eje Y' },
                    zaxis: { title: 'Función' }
                  }
                }}
                config={{ responsive: true, displayModeBar: true }}
              />
            ) : (
              <div style={{ textAlign: 'center', color: '#6c757d', padding: '20px' }}>
                <p style={{ fontSize: '18px', fontWeight: 'bold', color: '#1B396A' }}>Control Dimensional Requerido</p>
                <p style={{ fontSize: '14px', maxWidth: '400px', margin: '10px auto' }}>
                  El motor solo puede graficar un máximo de 2 ejes variables de manera simultánea. 
                  <br /><br />
                  Por favor, cambie el modo a <strong>"Valor Constante"</strong> en las variables excedentes para poder proyectar la sección de la gráfica.
                </p>
              </div>
            )}
          </div>

        </div>

      </div>

      {/* 1. MODAL OPCIONES INITIAL: MUCHAS VARIABLES */}
      {showModalOptions && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '15px', boxSizing: 'border-box' }}>
          <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', maxWidth: '450px', width: '100%', borderTop: '5px solid #1B396A' }}>
            <p style={{ fontSize: '15px', color: '#333', lineHeight: '1.4' }}>Tienes muchas variables y no es posible graficar de esta manera. ¿Desea modificar el valor de alguna variable?</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button onClick={() => { setShowModalOptions(false); handleProcessGraph(detectedVariables); }} style={{ padding: '8px 16px', backgroundColor: '#6c757d', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>No</button>
              <button onClick={handleOpenFormModal} style={{ padding: '8px 16px', backgroundColor: '#1B396A', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Sí</button>
            </div>
          </div>
        </div>
      )}

      {/* 2. MODAL FORMULARIO DE EDICIÓN TEMPORAL */}
      {showModalForm && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1001, padding: '15px', boxSizing: 'border-box' }}>
          <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', maxWidth: '500px', width: '100%', maxHeight: '85vh', overflowY: 'auto', borderTop: '5px solid #1B396A' }}>
            <h3 style={{ marginTop: 0, color: '#1B396A' }}>Configuración Temporal de Variables</h3>
            <div style={{ margin: '15px 0' }}>
              {tempVariables.map((variable) => (
                <div key={variable.name} style={{ background: '#f8f9fa', padding: '12px', borderRadius: '6px', marginBottom: '12px', border: '1px solid #dee2e6' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span>Variable: <span style={{ color: '#1B396A', fontSize: '16px', fontWeight: 'bold' }}>{variable.name}</span></span>
                    <button 
                      onClick={() => toggleTempVariableMode(variable.name)}
                      style={{ padding: '4px 8px', fontSize: '11px', textTransform: 'uppercase', fontWeight: 'bold', cursor: 'pointer', borderRadius: '4px', border: 'none', backgroundColor: variable.isConstant ? '#6c757d' : '#248165', color: '#fff' }}
                    >
                      {variable.isConstant ? 'Valor Constante' : 'Valor Gráfico'}
                    </button>
                  </div>
                  {variable.isConstant ? (
                    <input
                      type="text"
                      value={variable.constantValue}
                      onChange={(e) => handleTempVariableChange(variable.name, 'constantValue', e.target.value)}
                      style={{ width: '100%', padding: '6px', boxSizing: 'border-box' }}
                    />
                  ) : (
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <input type="number" step="1" value={variable.min} onChange={(e) => handleTempVariableChange(variable.name, 'min', e.target.value)} style={{ width: '100%', padding: '6px' }} />
                      <input type="number" step="1" value={variable.max} onChange={(e) => handleTempVariableChange(variable.name, 'max', e.target.value)} style={{ width: '100%', padding: '6px' }} />
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={handleCancelFormModal} style={{ padding: '8px 16px', backgroundColor: '#6c757d', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Cancelar</button>
              <button onClick={handleAcceptFormModal} style={{ padding: '8px 16px', backgroundColor: '#1B396A', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Aceptar</button>
            </div>
          </div>
        </div>
      )}

      {/* 3. MODAL CONFIRMACIÓN DE CANCELAR */}
      {showModalConfirmCancel && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1002, padding: '15px' }}>
          <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', maxWidth: '350px', width: '100%', textAlign: 'center' }}>
            <p style={{ fontWeight: 'bold', fontSize: '16px' }}>¿Está seguro?</p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginTop: '15px' }}>
              <button onClick={() => setShowModalConfirmCancel(false)} style={{ padding: '8px 20px', backgroundColor: '#6c757d', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>No</button>
              <button onClick={handleConfirmCancelSÍ} style={{ padding: '8px 20px', backgroundColor: '#dc3545', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Sí</button>
            </div>
          </div>
        </div>
      )}

      {/* 4. MODAL ADVERTENCIA DE CONDICIONES INCUMPLIDAS */}
      {showModalWarningCount && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1002, padding: '15px' }}>
          <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', maxWidth: '400px', width: '100%', borderTop: '5px solid #dc3545' }}>
            <p style={{ fontSize: '14px', color: '#333', lineHeight: '1.4' }}>Todavía no cumples con el requerimiento de solamente 1 o 2 variables activas ¿Deseas continuar aún así?</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button onClick={() => setShowModalWarningCount(false)} style={{ padding: '8px 16px', backgroundColor: '#6c757d', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>No</button>
              <button onClick={handleWarningCountSÍ} style={{ padding: '8px 16px', backgroundColor: '#1B396A', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Sí</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;