import React, { useState } from 'react';
import PropTypes from 'prop-types';

const KanbanBoard = () => {
  const [columns, setColumns] = useState([
    { id: 'todo', name: 'To Do', tasks: [] },
    { id: 'in-progress', name: 'In Progress', tasks: [] },
    { id: 'done', name: 'Done', tasks: [] }
  ]);

  const addTask = (columnId, taskName) => {
    if (!taskName.trim()) return; // Prevent adding empty tasks
    setColumns(prevColumns =>
      prevColumns.map(column =>
        column.id === columnId
          ? { ...column, tasks: [...column.tasks, { id: Date.now(), name: taskName }] }
          : column
      )
    );
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      {columns.map(column => (
        <div key={column.id} style={{ margin: '10px', padding: '10px', border: '1px solid #ccc', width: '30%' }}>
          <h2>{column.name}</h2>
          <input type='text' placeholder='Add a task' onKeyDown={e => { if (e.key === 'Enter') { addTask(column.id, e.target.value); e.target.value = ''; } }} />
          <ul>
            {column.tasks.map(task => (
              <li key={task.id}>{task.name}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
};

KanbanBoard.propTypes = {
  columns: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      tasks: PropTypes.arrayOf(
        PropTypes.shape({
          id: PropTypes.number.isRequired,
          name: PropTypes.string.isRequired
        })
      ).isRequired
    })
  ).isRequired
};

export default KanbanBoard;