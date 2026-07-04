import React, { useState } from 'react';

function App() {
  const [todos, setTodos] = useState([]);
  const [newTodo, setNewTodo] = useState('');
  const [tags, setTags] = useState('');

  const addTodo = () => {
    if (!newTodo) return;
    const todo = { text: newTodo, tags: tags.split(',').map(tag => tag.trim()) };
    setTodos([...todos, todo]);
    setNewTodo('');
    setTags('');
  };

  const removeTodo = (index) => {
    const newTodos = todos.filter((_, i) => i !== index);
    setTodos(newTodos);
  };

  return (
    <div>
      <h1>Todo List</h1>
      <input
        type='text'
        placeholder='Add a new todo'
        value={newTodo}
        onChange={(e) => setNewTodo(e.target.value)}
      />
      <input
        type='text'
        placeholder='Add tags (comma separated)'
        value={tags}
        onChange={(e) => setTags(e.target.value)}
      />
      <button onClick={addTodo}>Add Todo</button>
      <ul>
        {todos.map((todo, index) => (
          <li key={index}>
            <span>{todo.text}</span>
            <div>{todo.tags.join(', ')}</div>
            <button onClick={() => removeTodo(index)}>Remove</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;