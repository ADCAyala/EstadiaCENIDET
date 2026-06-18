import React, { useState, useEffect } from 'react';
import { parse, SymbolNode } from 'mathjs/number';

function App() {

  const [expression, setExpression] = useState('Tan(Acos(Divide(Norm(Csc(v)), Csch(S))))');

  const [detectedVariables, setDetectedVariables] = useState([]);

  const [error, setError] = useState('');


  useEffect(() => {
    try {
      setError('');
      if (!expression.trim()) {
        setDetectedVariables([]);
        return;
      }


      const node = parse(expression);
      

      const symbols = [];
      node.traverse((childNode) => {
        if (childNode.isSymbolNode && !childNode.isPointer) {

          const nativeFunctions = [
          'Sin', 'Cos', 'Tan', 'Log', 'Exp', 'Sqrt', 'Add', 'Sub', 'Mul', 'Div',
          'Acos', 'Csc', 'Csch', 'Norm', 'Divide'
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
    } catch (err) {

      setError('Error de sintaxis: Estructura matemática no reconocida.');
    }
  }, [expression]);



  return (
    <div style={{ fontFamily: 'Arial, sans-serif', padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
      <header style={{ borderBottom: '20px solid #1B396A', paddingBottom: '10px', marginBottom: '20px' }}>
        <h1 style={{ color: 'white' }}>Prototipo de GenMath - CENIDET</h1>
        <p style={{ color: '#666' }}>Avance de Estadía: Módulo de Inserción y Detección Automática de Variables</p>
      </header>

      <div style={{ display: 'flex', gap: '20px' }}>
        
        {/* PANEL IZQUIERDO: FORMULARIOS E INPUTS */}
        <div style={{ flex: 1, background: '#f4f4fbf', padding: '30px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h3>Control de Entrada</h3>
          
          {/* Cuadro de inserción de función */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>
              Ingrese la Función del Algoritmo Evolutivo:
            </label>
            <input
              type="text"
              value={expression}
              onChange={(e) => setExpression(e.target.value)}
              style={{ width: '100%', padding: '10px', fontSize: '16px', borderRadius: '4px', border: '1px solid #ccc' }}
              placeholder="Ej. add(div(1, x), mul(3, y))"
            />
            {error && <p style={{ color: 'red', fontSize: '14px', marginTop: '5px' }}>{error}</p>}
          </div>

          {/* Formulario de Variables y Rangos */}
          <div style={{ marginTop: '20px' }}>
            <h4>Variables Independientes Detectadas</h4>
            {detectedVariables.length === 0 ? (
              <p style={{ color: '#888', fontStyle: 'italic' }}>Ninguna variable detectada. Ingrese letras como 'x' o 'y'.</p>
            ) : (
              detectedVariables.map((variable) => (
                <div key={variable.name} style={{ background: '#fff', padding: '12px', borderRadius: '6px', marginBottom: '10px', border: '1px solid #e0e0e0' }}>
                  <strong style={{ fontSize: '16px', color: '#7c2222' }}>Variable: {variable.name}</strong>
                  <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                    <div>
                      <label style={{ fontSize: '12px', display: 'block' }}>Rango Mínimo:</label>
                      <input
                        type="number"
                        value={variable.min}
                        onChange={(e) => handleRangeChange(variable.name, 'min', e.target.value)}
                        style={{ width: '80px', padding: '5px' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', display: 'block' }}>Rango Máximo:</label>
                      <input
                        type="number"
                        value={variable.max}
                        onChange={(e) => handleRangeChange(variable.name, 'max', e.target.value)}
                        style={{ width: '80px', padding: '5px' }}
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* PANEL DERECHO: CONTENEDOR DE LA GRÁFICA (PLACEHOLDER) */}
        <div style={{ flex: 1.2, display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Cuadro de representación algebraica */}
          <div style={{ background: '#fff', padding: '15px', borderRadius: '8px', border: '1px solid #ddd' }}>
            <h4 style={{ margin: '0 0 10px 0' }}>Expresión a evaluar:</h4>
            <div style={{ padding: '10px', background: '#fafafa', borderRadius: '4px', fontStyle: 'italic', fontSize: '18px', fontFamily: 'monospace' }}>
              {expression || 'Esperando entrada...'}
            </div>
          </div>

          {/* Cuadro de la gráfica */}
          <div style={{ 
            flex: 1, 
            minHeight: '300px', 
            background: '#222', 
            color: '#0f0', 
            borderRadius: '8px', 
            display: 'flex', 
            flexDirection: 'column',
            justifyContent: 'center', 
            alignItems: 'center',
            boxShadow: 'inset 0 0 20px rgba(0,0,0,0.8)',
            position: 'relative'
          }}>
            <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#fff' }}>[ Aquí va una gráfica ]</span>
            <span style={{ fontSize: '14px', color: '#aaa', marginTop: '5px' }}> {detectedVariables.length > 1 ? '3D' : '2D'}</span>
            
            {detectedVariables.length > 0 && (
              <div style={{ position: 'absolute', bottom: '15px', left: '15px', color: '#88f', fontSize: '12px', textAlign: 'left' }}>
                <strong>Límites actuales del motor:</strong><br />
                {detectedVariables.map(v => `${v.name}: [${v.min}, ${v.max}]`).join(' | ')}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}

export default App;