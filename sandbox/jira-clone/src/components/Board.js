import React, { useState } from 'react';
import Task from '../models/Task';

const Board = () => {
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [newProjectTitle, setNewProjectTitle] = useState('');
  const [invitedUsers, setInvitedUsers] = useState([]);

  const addProject = (project) => {
    setProjects([...projects, project]);
  };

  const addTask = (task) => {
    setTasks([...tasks, task]);
  };

  const updateColumnTitle = (columnId, newTitle) => {
    setProjects(projects.map(project => project.id === columnId ? { ...project, title: newTitle } : project));
  };

  const inviteUsers = (projectId, users) => {
    // Logic to associate invited users with the project. 
    const updatedProjects = projects.map(project => 
      project.id === projectId ? { ...project, invitedUsers: [...project.invitedUsers, ...users] } : project
    );
    setProjects(updatedProjects);
  };

  const handleAddProject = () => {
    if (newProjectTitle) {
      const newProject = { id: Date.now(), title: newProjectTitle, invitedUsers: [] };
      addProject(newProject);
      setNewProjectTitle('');
    }
  };

  return (
    <div className="board">
      <input type="text" value={newProjectTitle} onChange={(e) => setNewProjectTitle(e.target.value)} placeholder="New Project Title" />
      <button onClick={handleAddProject}>Add Project</button>
      <div>
        <h3>Invite Users</h3>
        <input type="text" onChange={(e) => setInvitedUsers(e.target.value.split(','))} placeholder="Enter emails separated by commas" />
        <button onClick={() => inviteUsers(projects[projects.length - 1]?.id || 0, invitedUsers)}>Invite</button>
      </div>
      {/* Render projects and columns with editable titles and task cards here */}
    </div>
  );
};

export default Board;