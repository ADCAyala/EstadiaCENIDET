import React, { useState, useEffect } from 'react';
import { parse, SymbolNode } from 'mathjs/number';
import Plot from 'react-plotly.js';

function App() {

  const [expression, setExpression] = useState('sin(x) + cos(y) + tan(z)'); 
  const [detectedVariables, setDetectedVariables] = useState([]);
  const [error, setError] = useState('');
  const [plotData, setPlotData] = useState([]);

  const [revision, setRevision] = useState(0);
  const [graphLayout, setGraphLayout] = useState({
    autosize: true,
    width: window.innerWidth <= 768 ? window.innerWidth - 60 : 620,
    height: window.innerWidth <= 768 ? 360 : 450,
    margin: { l: 40, r: 40, b: 40, t: 20 },
    scene: {} // Almacenamiento persistente de la cámara 3D
  });

  const [showModalOptions, setShowModalOptions] = useState(false);
  const [showModalForm, setShowModalForm] = useState(false);
  const [showModalConfirmCancel, setShowModalConfirmCancel] = useState(false);
  const [showModalWarningCount, setShowModalWarningCount] = useState(false);

  // Copia de trabajo temporal para el formulario emergente
  const [tempVariables, setTempVariables] = useState([]);

  // Diccionario de funciones
   const cenidetMathScope = {
    // Funciones básicas
    add: (a, b) => a + b,
    sub: (a, b) => a - b,
    mul: (a, b) => a * b,
    div: (a, b) => Math.abs(b) < 1e-12 ? null : a / b,
    divide: (a, b) => Math.abs(b) < 1e-12 ? null : a / b,
    Add: (a, b) => a + b,
    Sub: (a, b) => a - b,
    Mul: (a, b) => a * b,
    Div: (a, b) => Math.abs(b) < 1e-12 ? null : a / b,
    Divide: (a, b) => Math.abs(b) < 1e-12 ? null : a / b,
    norm: (a) => Math.abs(a),
    Norm: (a) => Math.abs(a),
    // Potencias y raíces
    sqrt: (a) => a < 0 ? null : Math.sqrt(a),
    Sqrt: (a) => a < 0 ? null : Math.sqrt(a),
    sqr: (a) => a * a,
    Sqr: (a) => a * a,
    square: (a) => a * a,
    Square: (a) => a * a,
    // Logaritmos
    log: (a) => a <= 0 ? null : Math.log(a),
    Log: (a) => a <= 0 ? null : Math.log(a),
    // Extremos y trigonométricas
    min: (a, b) => Math.min(a, b),
    max: (a, b) => Math.max(a, b),
    MIN: (a, b) => Math.min(a, b),
    MAX: (a, b) => Math.max(a, b),
    minimum: (a, b) => Math.min(a, b),
    Minimum: (a, b) => Math.min(a, b),
    maximum: (a, b) => Math.max(a, b),
    Maximum: (a, b) => Math.max(a, b),
    Sin: (a) => Math.sin(a),
    Sen: (a) => Math.sin(a),
    sen: (a) => Math.sin(a),
    Cos: (a) => Math.cos(a),
    Tan: (a) => Math.tan(a),
    Acos: (a) => (a < -1 || a > 1) ? null : Math.acos(a),
    Asin: (a) => (a < -1 || a > 1) ? null : Math.asin(a),
    Atan: (a) => Math.atan(a),
    Csc: (a) => { const s = Math.sin(a); return Math.abs(s) < 1e-12 ? null : 1 / s; },
    csc: (a) => { const s = Math.sin(a); return Math.abs(s) < 1e-12 ? null : 1 / s; },
    Csch: (a) => { const s = Math.sinh(a); return Math.abs(s) < 1e-12 ? null : 1 / s; },
    csch: (a) => { const s = Math.sinh(a); return Math.abs(s) < 1e-12 ? null : 1 / s; },
    Sinh: (a) => Math.sinh(a),
    Cosh: (a) => Math.cosh(a),
    Tanh: (a) => Math.tanh(a),
    Exp: (a) => Math.exp(a)
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
            'Sin', 'Sen', 'sen', 'Cos', 'Tan', 'Log', 'Exp', 'Sqrt', 'Add', 'Sub', 'Mul', 'Div',
            'acos', 'csc', 'csch', 'norm', 'divide', 'Acos', 'Csc', 'Csch', 'Norm', 'Divide',
            'tanh', 'sinh', 'cosh', 'Tanh', 'Sinh', 'Cosh',
            'sqr', 'Sqr', 'square', 'Square',
            'min', 'max', 'MIN', 'MAX', 'minimum', 'Minimum', 'maximum', 'Maximum'
          ];
          if (!nativeFunctions.includes(childNode.name) && !symbols.includes(childNode.name)) {
            symbols.push(childNode.name);
          }
        }
      });

      // Usamos las variables del formulario 
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

      // Guardamos las variables validadas
      setDetectedVariables(currentVars);

      // Validación de cantidad de variables
      if (activeAxes.length > 2 && !varsToUse) {
        setTempVariables(JSON.parse(JSON.stringify(currentVars)));
        setShowModalOptions(true);
        return;
      }

      const baseScope = { ...cenidetMathScope };
      constantFields.forEach(c => {
        baseScope[c.name] = c.constantValue === '' || c.constantValue === '-' ? 0 : Number(c.constantValue);
      });

      // GENERACIÓN DE PUNTOS EN 2D (1 VARIABLE ACTIVA)
      if (activeAxes.length === 1) {
        const v1 = activeAxes[0];
        const rawMin = v1.min === '' || v1.min === '-' ? -10 : Number(v1.min);
        const rawMax = v1.max === '' || v1.max === '-' ? 10 : Number(v1.max);
        const minVal = Math.min(rawMin, rawMax);
        const maxVal = Math.max(rawMin, rawMax);

        const xValues = [];
        const yValues = [];
        const steps = 100;
        const stepSize = (maxVal - minVal) / steps;

        for (let i = 0; i <= steps; i++) {
          const currentVal = minVal + (i * stepSize);
          xValues.push(currentVal);
          const scope = { ...baseScope, [v1.name]: currentVal };
          try {
            const res = compiled.evaluate(scope);
            yValues.push(res);
          } catch (e) {
            yValues.push(null);
          }
        }

        const hasValidPoints = yValues.some(val => val !== null && !isNaN(val) && isFinite(val));
        if (!hasValidPoints) {
          setError('Aviso: La función no tiene valores reales dentro del rango configurado.');
          setPlotData([]);
          return;
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

      // GENERACIÓN DE PUNTOS EN 3D (2 VARIABLES ACTIVAS)
      } else if (activeAxes.length === 2) {
        const v1 = activeAxes[0];
        const v2 = activeAxes[1];
        
        const rawMinX = v1.min === '' || v1.min === '-' ? -10 : Number(v1.min);
        const rawMaxX = v1.max === '' || v1.max === '-' ? 10 : Number(v1.max);
        const minX = Math.min(rawMinX, rawMaxX);
        const maxX = Math.max(rawMinX, rawMaxX);

        const rawMinY = v2.min === '' || v2.min === '-' ? -10 : Number(v2.min);
        const rawMaxY = v2.max === '' || v2.max === '-' ? 10 : Number(v2.max);
        const minY = Math.min(rawMinY, rawMaxY);
        const maxY = Math.max(rawMinY, rawMaxY);

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
            try {
              const res = compiled.evaluate(scope);
              row.push(res);
            } catch (e) {
              row.push(null);
            }
          }
          zValues.push(row);
        }

        const hasValidPoints = zValues.some(row => row.some(val => val !== null && !isNaN(val) && isFinite(val)));
        if (!hasValidPoints) {
          setError('Aviso: La función no tiene valores reales dentro del rango configurado.');
          setPlotData([]);
          return;
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

    setRevision((prev) => prev + 1);
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
      <header style={{ borderBottom: '4px solid #1B396A', paddingBottom: '20px', marginBottom: '20px' }}>
        <h1 style={{ color: '#333', margin: 0 }}>GenMath PWA - CENIDET</h1>

      </header>

      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', flexDirection: window.innerWidth <= 768 ? 'column' : 'row', width: '100%', boxSizing: 'border-box' }}>
        
        {/* PANEL IZQUIERDO: CONTROLES */}
        <div style={{ flex: '1', minWidth: window.innerWidth <= 768 ? '100%' : '300px', background: '#f8f9fa', padding: '15px', borderRadius: '8px', border: '1px solid #e9ecef', boxSizing: 'border-box',order: (window.innerWidth <= 768 && plotData.length > 0) ? 3 : 1}}>
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
                placeholder="Ej. sin(x) + cos(y) + tan(z)"
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
{/* ACORDEÓN DESPLEGABLE: TABLA DE FUNCIONES E IDENTIFICADORES */}
<details style={{ marginTop: '10px', background: '#ffffff', borderRadius: '6px', border: '1px solid #dee2e6', padding: '8px 12px', cursor: 'pointer' }}>
  <summary style={{ fontWeight: 'bold', color: '#1B396A', fontSize: '13px', outline: 'none' }}>
    ℹ️ Guía Rápida funciones aceptadas (Presione para desplegar)
  </summary>
  
  <div style={{ marginTop: '10px', overflowX: 'auto' }}>
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px', fontFamily: 'Arial, sans-serif', textAlign: 'left' }}>
      <thead>
        <tr style={{ background: '#5B9BD5', color: '#ffffff' }}>
          <th style={{ padding: '8px 10px', border: '1px solid #d9d9d9', fontWeight: 'bold' }}>Función / Identificadores</th>
          <th style={{ padding: '8px 10px', border: '1px solid #d9d9d9', fontWeight: 'bold' }}>Implementación Lógica</th>
          <th style={{ padding: '8px 10px', border: '1px solid #d9d9d9', fontWeight: 'bold' }}>Significado Matemático</th>
        </tr>
      </thead>
      <tbody>
        <tr style={{ background: '#f2f2f2' }}>
          <td style={{ padding: '6px 10px', border: '1px solid #d9d9d9', fontWeight: 'bold' }}>add, Add</td>
          <td style={{ padding: '6px 10px', border: '1px solid #d9d9d9' }}><code>(a, b) =&gt; a + b</code></td>
          <td style={{ padding: '6px 10px', border: '1px solid #d9d9d9' }}>Suma aritmética binaria</td>
        </tr>
        <tr>
          <td style={{ padding: '6px 10px', border: '1px solid #d9d9d9', fontWeight: 'bold' }}>sub, Sub</td>
          <td style={{ padding: '6px 10px', border: '1px solid #d9d9d9' }}><code>(a, b) =&gt; a - b</code></td>
          <td style={{ padding: '6px 10px', border: '1px solid #d9d9d9' }}>Resta o sustracción aritmética</td>
        </tr>
        <tr style={{ background: '#f2f2f2' }}>
          <td style={{ padding: '6px 10px', border: '1px solid #d9d9d9', fontWeight: 'bold' }}>mul, Mul</td>
          <td style={{ padding: '6px 10px', border: '1px solid #d9d9d9' }}><code>(a, b) =&gt; a * b</code></td>
          <td style={{ padding: '6px 10px', border: '1px solid #d9d9d9' }}>Multiplicación aritmética</td>
        </tr>
        <tr>
          <td style={{ padding: '6px 10px', border: '1px solid #d9d9d9', fontWeight: 'bold' }}>div, Div, Divide</td>
          <td style={{ padding: '6px 10px', border: '1px solid #d9d9d9' }}><code>(a, b) =&gt; |b| &lt; 1e-12 ? null : a / b</code></td>
          <td style={{ padding: '6px 10px', border: '1px solid #d9d9d9' }}>División aritmética con omisión de división entre cero</td>
        </tr>
        <tr style={{ background: '#f2f2f2' }}>
          <td style={{ padding: '6px 10px', border: '1px solid #d9d9d9', fontWeight: 'bold' }}>norm, Norm</td>
          <td style={{ padding: '6px 10px', border: '1px solid #d9d9d9' }}><code>(a) =&gt; Math.abs(a)</code></td>
          <td style={{ padding: '6px 10px', border: '1px solid #d9d9d9' }}>Cálculo del valor absoluto o magnitud</td>
        </tr>
        <tr>
          <td style={{ padding: '6px 10px', border: '1px solid #d9d9d9', fontWeight: 'bold' }}>sqrt, Sqrt</td>
          <td style={{ padding: '6px 10px', border: '1px solid #d9d9d9' }}><code>(a) =&gt; a &lt; 0 ? null : Math.sqrt(a)</code></td>
          <td style={{ padding: '6px 10px', border: '1px solid #d9d9d9' }}>Raíz cuadrada restringida a números no negativos</td>
        </tr>
        <tr style={{ background: '#f2f2f2' }}>
          <td style={{ padding: '6px 10px', border: '1px solid #d9d9d9', fontWeight: 'bold' }}>sqr, Sqr, square, Square</td>
          <td style={{ padding: '6px 10px', border: '1px solid #d9d9d9' }}><code>(a) =&gt; a * a</code></td>
          <td style={{ padding: '6px 10px', border: '1px solid #d9d9d9' }}>Potencia cuadrática</td>
        </tr>
        <tr>
          <td style={{ padding: '6px 10px', border: '1px solid #d9d9d9', fontWeight: 'bold' }}>log, Log</td>
          <td style={{ padding: '6px 10px', border: '1px solid #d9d9d9' }}><code>(a) =&gt; a &lt;= 0 ? null : Math.log(a)</code></td>
          <td style={{ padding: '6px 10px', border: '1px solid #d9d9d9' }}>Logaritmo natural restringido a valores positivos</td>
        </tr>
        <tr style={{ background: '#f2f2f2' }}>
          <td style={{ padding: '6px 10px', border: '1px solid #d9d9d9', fontWeight: 'bold' }}>min, MIN, minimum, Minimum</td>
          <td style={{ padding: '6px 10px', border: '1px solid #d9d9d9' }}><code>(a, b) =&gt; Math.min(a, b)</code></td>
          <td style={{ padding: '6px 10px', border: '1px solid #d9d9d9' }}>Determinación del valor extremo mínimo</td>
        </tr>
        <tr>
          <td style={{ padding: '6px 10px', border: '1px solid #d9d9d9', fontWeight: 'bold' }}>max, MAX, maximum, Maximum</td>
          <td style={{ padding: '6px 10px', border: '1px solid #d9d9d9' }}><code>(a, b) =&gt; Math.max(a, b)</code></td>
          <td style={{ padding: '6px 10px', border: '1px solid #d9d9d9' }}>Determinación del valor extremo máximo</td>
        </tr>
        <tr style={{ background: '#f2f2f2' }}>
          <td style={{ padding: '6px 10px', border: '1px solid #d9d9d9', fontWeight: 'bold' }}>Sin, Cos, Tan</td>
          <td style={{ padding: '6px 10px', border: '1px solid #d9d9d9' }}><code>Math.sin(a), Math.cos(a), Math.tan(a)</code></td>
          <td style={{ padding: '6px 10px', border: '1px solid #d9d9d9' }}>Funciones trigonométricas directas</td>
        </tr>
        <tr>
          <td style={{ padding: '6px 10px', border: '1px solid #d9d9d9', fontWeight: 'bold' }}>Asin, Acos, Atan</td>
          <td style={{ padding: '6px 10px', border: '1px solid #d9d9d9' }}><code>Math.asin(a), Math.acos(a), Math.atan(a)</code></td>
          <td style={{ padding: '6px 10px', border: '1px solid #d9d9d9' }}>Funciones trigonométricas inversas con validación de dominio [-1, 1]</td>
        </tr>
        <tr style={{ background: '#f2f2f2' }}>
          <td style={{ padding: '6px 10px', border: '1px solid #d9d9d9', fontWeight: 'bold' }}>Csc, csc</td>
          <td style={{ padding: '6px 10px', border: '1px solid #d9d9d9' }}><code>1 / Math.sin(a)</code></td>
          <td style={{ padding: '6px 10px', border: '1px solid #d9d9d9' }}>Cosecante trigonométrica con control de indeterminación</td>
        </tr>
        <tr>
          <td style={{ padding: '6px 10px', border: '1px solid #d9d9d9', fontWeight: 'bold' }}>Csch, csch</td>
          <td style={{ padding: '6px 10px', border: '1px solid #d9d9d9' }}><code>1 / Math.sinh(a)</code></td>
          <td style={{ padding: '6px 10px', border: '1px solid #d9d9d9' }}>Cosecante hiperbólica con control de indeterminación</td>
        </tr>
      </tbody>
    </table>
  </div>
</details>
          <div>
            <h4 style={{ marginBottom: '10px' }}>Mapeo Dinámico de Variables</h4>
            {detectedVariables.length === 0 ? (
              <p style={{ color: '#6c757d', fontStyle: 'italic' }}>Introduzca una función.</p>
            ) : (
              <>
                {/* Variables Modo Gráfico */}
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

                {/* Variables Modo Constante */}
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
            )}
          </div>
        </div>

        {/* PANEL DERECHO: LIENZO GRÁFICO */}
        <div style={{ 
          flex: '1.5', 
          minWidth: window.innerWidth <= 768 ? '100%' : '300px', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '15px', 
          boxSizing: 'border-box', 
          order: (window.innerWidth <= 768 && plotData.length > 0) ? 2 : 2 }}>

          <div style={{ 
            background: '#e9ecef', 
            padding: '12px 20px', 
            borderRadius: '6px', 
            fontFamily: 'monospace', 
            fontSize: '14px', 
            borderLeft: '5px solid #1B396A', 
            boxSizing: 'border-box', 
            wordBreak: 'break-word' }}>
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
            overflow: 'hidden',
            boxSizing: 'border-box'
          }}>
            {plotData.length > 0 ? (
              <Plot
                data={plotData}
                layout={{
                  autosize: graphLayout.autosize,
                  width: graphLayout.width,
                  height: graphLayout.height,
                  margin: graphLayout.margin,
                  datarevision: revision,
                  xaxis: {title: detectedVariables.filter(v => !v.isConstant)[0]?.name || 'x'},
                  yaxis: {title: detectedVariables.filter(v => !v.isConstant).length === 1? `f(${detectedVariables.filter(v => !v.isConstant)[0]?.name || 'x'})`: 'f'},
                  scene: {
                  camera: graphLayout.scene?.camera,
                  xaxis: {title: detectedVariables.filter(v => !v.isConstant)[0]?.name || 'Eje X' },
                  yaxis: {title: detectedVariables.filter(v => !v.isConstant)[1]?.name || 'Eje Y' },
                  zaxis: { title: detectedVariables.filter(v => !v.isConstant).length === 2? `f(${detectedVariables.filter(v => !v.isConstant)[0]?.name}, ${detectedVariables.filter(v => !v.isConstant)[1]?.name})`: 'f'}                    
                  }
                  }}
                // GUARDA LA PERSPECTIVA ACTUAL CADA QUE SE MUEVE LA GRÁFICA
                onRelayout={(eventData) => {
                  if (eventData['scene.camera']) {
                    setGraphLayout(prev => ({
                      ...prev,
                      scene: {
                        ...prev.scene,
                        camera: eventData['scene.camera']
                      }
                    }));
                  }
                }}
                config={{ 
                  responsive: true, 
                  displayModeBar: true,
                  toImageButtonOptions: {
                    format: 'png',
                    filename: 'grafica_genmath',
                    height: 700,
                    width: 900,
                    scale: 2
                  }
                }}
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

      {/* MODALES */}
      {showModalOptions && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '15px', boxSizing: 'border-box' }}>
          <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', maxWidth: '400px', width: '90%', borderTop: '5px solid #1B396A', boxSizing: 'border-box' }}>
            <p style={{ fontSize: '15px', color: '#333', lineHeight: '1.4', margin: 0 }}>Tienes muchas variables y no es posible graficar de esta manera. ¿Desea modificar el valor de alguna variable?</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button onClick={() => { setShowModalOptions(false); handleProcessGraph(detectedVariables); }} style={{ padding: '8px 16px', backgroundColor: '#6c757d', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>No</button>
              <button onClick={handleOpenFormModal} style={{ padding: '8px 16px', backgroundColor: '#1B396A', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Sí</button>
            </div>
          </div>
        </div>
      )}

      {showModalForm && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1001, padding: '15px', boxSizing: 'border-box' }}>
          <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', maxWidth: '440px', width: '90%', maxHeight: '80vh', overflowY: 'auto', borderTop: '5px solid #1B396A', boxSizing: 'border-box' }}>
            <h3 style={{ marginTop: 0, color: '#1B396A', fontSize: '18px' }}>Configuración Temporal de Variables</h3>
            <div style={{ margin: '15px 0' }}>
              {tempVariables.map((variable) => (
                <div key={variable.name} style={{ background: '#f8f9fa', padding: '12px', borderRadius: '6px', marginBottom: '12px', border: '1px solid #dee2e6', boxSizing: 'border-box' }}>
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
                      <input type="number" step="1" value={variable.min} onChange={(e) => handleTempVariableChange(variable.name, 'min', e.target.value)} style={{ width: '100%', padding: '6px', boxSizing: 'border-box' }} />
                      <input type="number" step="1" value={variable.max} onChange={(e) => handleTempVariableChange(variable.name, 'max', e.target.value)} style={{ width: '100%', padding: '6px', boxSizing: 'border-box' }} />
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