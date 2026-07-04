class Task {
  constructor(id, title, description, status, assignedUsers = []) {
    this.id = id;
    this.title = title;
    this.description = description;
    this.status = status;
    this.assignedUsers = assignedUsers;
  }
}

export default Task;