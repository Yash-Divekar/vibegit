import React, { useState } from 'react'

function App() {
  const [count, setCount] = useState(0)
  return (
    <div style={{ padding: '24px', fontFamily: 'sans-serif' }}>
      <h1>Welcome to React Sandbox</h1>
      <button onClick={() => setCount(count + 1)}>Count: {count}</button>
    </div>
  )
}
export default App
