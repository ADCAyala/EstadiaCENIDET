import React, { useState, useEffect } from 'react';
import { parse, SymbolNode } from 'mathjs/number';
import Plot from 'react-plotly.js';

function App() {

  const [expression, setExpression] = useState('sin(x) + cos(y) + sin(z)'); 

  const [detectedVariables, setDetectedVariables] = useState([]);

  const [error, setError] = useState('');

  const [plotData, setPlotData] = useState([]);

  //Diccionario de funciones
  const cenidetMathScope = {
    add: (a, b) => a + b,
    sub: (a, b) => a - b,
    mul: (a, b) => a * b,
    div: (a, b) => a / b,
    Add: (a, b) => a + b,
    Sub: (a, b) => a - b,
    Mul: (a, b) => a * b,
    Div: (a, b) => a / b,
    Divide: (a, b) => a / b,
    Norm: (a) => Math.abs(a)
  };

  useEffect(() => {
    try {
      setError('');
      if (!expression.trim()) {
        setDetectedVariables([]);
        setPlotData([]);
        return;
      }


      const node = parse(expression);
      const compiled = node.compile();
      

      const symbols = [];
      node.traverse((childNode) => {
        if (childNode.isSymbolNode && !childNode.isPointer) {

          const nativeFunctions = [
            'sin', 'cos', 'tan', 'log', 'exp', 'sqrt', 'add', 'sub', 'mul', 'div',
            'Sin', 'Cos', 'Tan', 'Log', 'Exp', 'Sqrt', 'Add', 'Sub', 'Mul', 'Div',
            'acos', 'csc', 'csch', 'norm', 'divide', 'Acos', 'Csc', 'Csch', 'Norm', 'Divide'
          ];
          if (!nativeFunctions.includes(childNode.name) && !symbols.includes(childNode.name)) {
            symbols.push(childNode.name);
          }
        }
      });


      const updatedVars = symbols.map(varName => {
        const existingVar = detectedVariables.find(v => v.name === varName);
        return existingVar ? existingVar : { 
          name: varName, 
          isConstant: false, // Por defecto todas inician como rango variable
          min: '-10', 
          max: '10',
          constantValue: '5' // Valor constante inicial por defecto
        };
      });
      setDetectedVariables(updatedVars);

      // Separamos cuáles variables actúan como ejes activos y cuáles como constantes fijas
      const activeAxes = updatedVars.filter(v => !v.isConstant);
      const constantFields = updatedVars.filter(v => v.isConstant);

      // Construimos el entorno base inyectando primero los valores de las constantes fijas
      const baseScope = { ...cenidetMathScope };
      constantFields.forEach(c => {
        baseScope[c.name] = c.constantValue === '' || c.constantValue === '-' ? 0 : Number(c.constantValue);
      });


      //Generacion de puntos para la grafica
      if (activeAxes.length === 1) {
        // RENDERING 2D
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
            line: { color: '#7c2222', width: 3 }
          }
        ]);

      } else if (activeAxes.length === 2) {
        // RENDERING 3D (Superficie)
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
            const scope = {
              ...baseScope,
              [v1.name]: xValues[i],
              [v2.name]: yValues[j]
            };
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
        // Si hay más de 2 ejes activos o ninguno, limpiamos el lienzo para mostrar advertencia
        setPlotData([]);
      }


    } catch (err) {

      setError('Error de sintaxis: Estructura matemática no reconocida.');
    }
  }, [expression, JSON.stringify(detectedVariables)]); // Dependencias: expresión y variables detectadas

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
            <input
              type="text"
              value={expression}
              onChange={(e) => setExpression(e.target.value)}
              style={{ width: '100%', padding: '10px', fontSize: '16px', borderRadius: '4px', border: '1px solid #ced4da', boxSizing: 'border-box' }}
              placeholder="Ej. add(div(1, x), mul(3, y))"
            />
            {error && <p style={{ color: '#dc3545', fontSize: '13px', marginTop: '5px', fontWeight: 'bold' }}>{error}</p>}
          </div>

          <div>
            <h4 style={{ marginBottom: '10px' }}>Mapeo Dinámico de Variables</h4>
            {detectedVariables.length === 0 ? (
              <p style={{ color: '#6c757d', fontStyle: 'italic' }}>Introduzca una función.</p>
            ) : (
              detectedVariables.map((variable) => (
                <div key={variable.name} style={{ background: '#fff', padding: '12px', borderRadius: '6px', marginBottom: '12px', border: '1px solid #dee2e6' }}>
                  <div style={{ display: 'flex', justifyContent: 'between', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span>Variable: <span style={{ color: '#1B396A', fontSize: '18px', fontWeight: 'bold' }}>{variable.name}</span></span>
                    
                    {/* Botón Switch para alternar el Modo de Usabilidad */}
                    <button 
                      onClick={() => toggleVariableMode(variable.name)}
                      style={{ 
                        padding: '4px 8px', 
                        fontSize: '11px', 
                        textTransform: 'uppercase', 
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        borderRadius: '4px',
                        border: '1px solid',
                        backgroundColor: variable.isConstant ? '#6c757d' : '#248165',
                        color: '#fff'
                      }}
                    >
                      {variable.isConstant ? 'Valor Constante' : 'Valor Gráfico'}
                    </button>
                  </div>

                  {/* Renderizado condicional según el modo seleccionado */}
                  {variable.isConstant ? (
                    <div>
                      <label style={{ fontSize: '11px', color: '#495057', display: 'block', marginBottom: '4px' }}>Asignar Valor Constante Fijo:</label>
                      <input
                        type="text"
                        value={variable.constantValue}
                        onChange={(e) => handleVariableChange(variable.name, 'constantValue', e.target.value)}
                        style={{ width: '100%', padding: '6px', boxSizing: 'border-box' }}
                        placeholder="Ej. 5"
                      />
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: '11px', color: '#495057' }}>Mínimo:</label>
                        <input
                          type="text"
                          value={variable.min}
                          onChange={(e) => handleVariableChange(variable.name, 'min', e.target.value)}
                          style={{ width: '100%', padding: '6px', boxSizing: 'border-box' }}
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: '11px', color: '#495057' }}>Máximo:</label>
                        <input
                          type="text"
                          value={variable.max}
                          onChange={(e) => handleVariableChange(variable.name, 'max', e.target.value)}
                          style={{ width: '100%', padding: '6px', boxSizing: 'border-box' }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* PANEL DERECHO: LIENZO GRÁFICO */}
        <div style={{ flex: '1.5', minWidth: '400px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
          
          <div style={{ background: '#e9ecef', padding: '12px 20px', borderRadius: '6px', fontFamily: 'monospace', fontSize: '15px', borderLeft: '5px solid #1B396A' }}>
            <strong>Ejes Activos:</strong> {detectedVariables.filter(v=>!v.isConstant).map(v=>v.name).join(', ') || 'Ninguno'} <br />
            <strong>Constantes fijadas:</strong> {detectedVariables.filter(v=>v.isConstant).map(v=>`${v.name}=${v.constantValue || 0}`).join(', ') || 'Ninguna'}
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
                    xaxis: { title: detectedVariables.filter(v=>!v.isConstant)[0]?.name || 'X' },
                    yaxis: { title: detectedVariables.filter(v=>!v.isConstant)[1]?.name || 'Y' },
                    zaxis: { title: 'F(X)' }
                  }
                }}
                config={{ responsive: true, displayModeBar: true }}
              />
            ) : (
              <div style={{ textAlign: 'center', color: '#6c757d', padding: '20px' }}>
                <p style={{ fontSize: '18px', fontWeight: 'bold', color: '#1B396A' }}> Control Dimensional Requerido</p>
                <p style={{ fontSize: '14px', maxWidth: '400px', margin: '10px auto' }}>
                  El motor solo puede graficar un máximo de 2 ejes variables de manera simultánea. 
                  <br /><br />
                  Por favor, cambie el modo a <strong>"📍 Constante"</strong> en las variables excedentes para poder proyectar la sección de la gráfica.
                </p>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}

export default App;