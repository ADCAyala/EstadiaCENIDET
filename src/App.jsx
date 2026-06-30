import React, { useState, useEffect } from 'react';
import { parse, SymbolNode } from 'mathjs/number';
import Plot from 'react-plotly.js';

function App() {

  const [expression, setExpression] = useState('Tan(Acos(Divide(Norm(Csc(v)), Csch(S))))');

  const [detectedVariables, setDetectedVariables] = useState([]);

  const [error, setError] = useState('');

  const [plotData, setPlotData] = useState([]);

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
        return existingVar ? existingVar : { name: varName, min: -100, max: 100 };
      });
      setDetectedVariables(updatedVars);

      //Generacion de puntos para la grafica
      if (updatedVars.length === 1) {
        // --- RENDERING 2D ---
        const v1 = updatedVars[0];
        const xValues = [];
        const yValues = [];
        const steps = 100; // Cantidad de puntos en la curva
        const stepSize = (v1.max - v1.min) / steps;

        for (let i = 0; i <= steps; i++) {
          const val = v1.min + (i * stepSize);
          xValues.push(val);
          
          // Creamos el entorno con el valor actual de la variable
          const scope = { [v1.name]: val };
          yValues.push(compiled.evaluate(scope));
        }

        setPlotData([
          {
            x: xValues,
            y: yValues,
            type: 'scatter',
            mode: 'lines',
            line: { color: '#1B396A', width: 3 },
            name: expression
          }
        ]);

      } else if (updatedVars.length === 2) {
        // --- RENDERING 3D (Superficie) ---
        const v1 = updatedVars[0]; // Ej. 'x'
        const v2 = updatedVars[1]; // Ej. 'y'
        
        const xValues = [];
        const yValues = [];
        const zValues = []; // Matriz bidimensional para las alturas
        
        const steps = 30; // Resolución de la malla 3D (ajustada para rendimiento móvil)
        const stepX = (v1.max - v1.min) / steps;
        const stepY = (v2.max - v2.min) / steps;

        // Generamos los vectores de los ejes
        for (let i = 0; i <= steps; i++) xValues.push(v1.min + (i * stepX));
        for (let j = 0; j <= steps; j++) yValues.push(v2.min + (j * stepY));

        // Calculamos la malla Z
        for (let j = 0; j <= steps; j++) {
          const row = [];
          for (let i = 0; i <= steps; i++) {
            const scope = {
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
            colorscale: 'Hot',
            showscale: false
          }
        ]);
      } else {
        // Si hay 0 o más de 2 variables, limpiamos la gráfica momentáneamente
        setPlotData([]);
      }


    } catch (err) {

      setError('Error de sintaxis: Estructura matemática no reconocida.');
    }
  }, [expression, JSON.stringify(detectedVariables)]); // Dependencias: expresión y variables detectadas

  const handleRangeChange = (name, field, value) => {
    setDetectedVariables(prev =>
      prev.map(v => v.name === name ? { ...v, [field]: Number(value) } : v)
    );
  };

  





  return (
    <div style={{ fontFamily: 'Arial, sans-serif', padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
      <header style={{ borderBottom: '20px solid #1B396A', paddingBottom: '10px', marginBottom: '20px' }}>
        <h1 style={{ color: 'white' }}>Prototipo de GenMath - CENIDET</h1>
        <p style={{ color: '#666' }}>Avance de Estadía</p>
      </header>

      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        
        {/* PANEL IZQUIERDO: FORMULARIOS E INPUTS */}
        <div style={{ flex: '1', minWidth: '300px', background: '#f8f9fa', padding: '20px', borderRadius: '8px', border: '1px solid #e9ecef' }}>
          <h3 style={{ marginTop: 0, color: '#1B396A' }}>Configuración</h3>
          
          {/* Cuadro de inserción de función */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>
              Ingrese la Función a evaluar:
            </label>
            <input
              type="text"
              value={expression}
              onChange={(e) => setExpression(e.target.value)}
              style={{ width: '100%', padding: '10px', fontSize: '16px', borderRadius: '4px', border: '1px solid #ced4da',boxSizing: 'border-box' }}
              placeholder="Ej. add(div(1, x), mul(3, y))"
            />
            {error && <p style={{ color: '#dc3545', fontSize: '13px', marginTop: '5px', fontWeight: 'bold' }}>{error}</p>}
          </div>

          {/* Formulario de Variables y Rangos */}
          <div>
            <h4>Dominio</h4>
            {detectedVariables.length === 0 ? (
              <p style={{ color: '#6c757d', fontStyle: 'italic' }}>Escriba variables independientes (ej. x, y) para configurar sus límites.</p>
            ) : (
              detectedVariables.map((variable) => (
                <div key={variable.name} style={{ background: '#fff', padding: '15px', borderRadius: '6px', marginBottom: '12px', border: '1px solid #dee2e6' }}>
                  <span style={{ fontSize: '15px', fontWeight: 'bold' }}>Variable independiente: <span style={{ color: '#1B396A', fontSize: '18px' }}>{variable.name}</span></span>
                  <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '11px', textTransform: 'uppercase', color: '#495057' }}>Mínimo:</label>
                      <input
                        type="number"
                        value={variable.min}
                        onChange={(e) => handleRangeChange(variable.name, 'min', e.target.value)}
                        style={{ width: '100%', padding: '6px', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '11px', textTransform: 'uppercase', color: '#495057' }}>Máximo:</label>
                      <input
                        type="number"
                        value={variable.max}
                        onChange={(e) => handleRangeChange(variable.name, 'max', e.target.value)}
                        style={{ width: '100%', padding: '6px', boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* PANEL DERECHO: CONTENEDOR DE LA GRÁFICA (PLACEHOLDER) */}
        <div style={{ flex: '1.5', minWidth: '400px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
          
          <div style={{ background: '#e9ecef', padding: '12px 20px', borderRadius: '6px', fontFamily: 'monospace', fontSize: '16px', borderLeft: '5px solid #1B396A' }}>
            <strong>f({detectedVariables.map(v => v.name).join(', ') || '...'}) = </strong> {expression || 'Ø'}
          </div>

          <div style={{ 
            width: '100%', 
            minHeight: '450px', 
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
                  width: 600,
                  height: 440,
                  margin: { l: 40, r: 40, b: 40, t: 20 },
                  scene: {
                    xaxis: { title: detectedVariables[0]?.name || 'X' },
                    yaxis: { title: detectedVariables[1]?.name || 'Y' },
                    zaxis: { title: 'F(X,Y)' }
                  }
                }}
                config={{ responsive: true, displayModeBar: true }}
              />
            ) : (
              <div style={{ textAlign: 'center', color: '#6c757d', padding: '20px' }}>
                <p style={{ fontSize: '18px', fontWeight: 'bold' }}> Visualización no disponible</p>
                <p style={{ fontSize: '14px' }}>
                  {detectedVariables.length > 2 
                    ? 'Demasiadas variables, solucion en progreso...' 
                    : 'Ingrese una expresión válida para inicializar el renderizado.'}
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