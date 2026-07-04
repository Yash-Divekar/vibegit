import React, { useState } from 'react';

const App = () => {
  const [todos, setTodos] = useState([{ text: '', tags: [] }]);
  const [todoText, setTodoText] = useState('');
  const [tags, setTags] = useState('');

  const addTodo = () => {
    const newTodo = { text: todoText, tags: tags.split(',').map(tag => tag.trim()) };
    setTodos([...todos, newTodo]);
    setTodoText('');
    setTags('');
  };

  return (
    <div>
      <input
        type='text'
        value={todoText}
        onChange={(e) => setTodoText(e.target.value)}
        placeholder='Add todo'
      />
      <input
        type='text'
        value={tags}
        onChange={(e) => setTags(e.target.value)}
        placeholder='Add tags (comma separated)'
      />
      <button onClick={addTodo}>Add Todo</button>
      <ul>
        {todos.map((todo, index) => (
          <li key={index}>{todo.text} - Tags: {todo.tags.join(', ')}</li>
        ))}
      </ul>
    </div>
  );
};

export default App;