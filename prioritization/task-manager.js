/**
 * Task Management System
 * =======================
 * 
 * An efficient in-memory task manager for managing tasks, priority tags, and worker assignments.
 */

export class SuperSimpleTaskManager {
  constructor() {
    this.tasks = new Map();
    this.nextTaskId = 1;
  }

  /**
   * Creates and stores a new task with a unique sequential ID.
   * 
   * @param {string} description - The task description.
   * @returns {object} The created task object.
   */
  createTask(description) {
    const taskId = `TASK-${String(this.nextTaskId).padStart(3, '0')}`;
    const newTask = {
      id: taskId,
      description: description,
      priority: null,
      assigned_to: null
    };
    this.tasks.set(taskId, newTask);
    this.nextTaskId += 1;
    console.log(`   ⚙️  [Task Manager] Created: ${taskId} - "${description}"`);
    return newTask;
  }

  /**
   * Updates fields of a specific task.
   * 
   * @param {string} taskId - The ID of the task to update (e.g. TASK-001).
   * @param {object} updates - Key-value pairs of updates (priority, assigned_to).
   * @returns {object|null} The updated task, or null if not found.
   */
  updateTask(taskId, updates = {}) {
    const task = this.tasks.get(taskId);
    if (task) {
      if (updates.priority !== undefined) {
        task.priority = updates.priority;
      }
      if (updates.assigned_to !== undefined) {
        task.assigned_to = updates.assigned_to;
      }
      console.log(`   ⚙️  [Task Manager] Updated ${taskId} with:`, JSON.stringify(updates));
      return task;
    }
    console.log(`   ⚙️  [Task Manager] Task ${taskId} not found for update.`);
    return null;
  }

  /**
   * Generates a text summary of all tasks currently in the system.
   * 
   * @returns {string} Text representation of the task list.
   */
  listAllTasks() {
    if (this.tasks.size === 0) {
      return "No tasks in the system.";
    }
    const taskStrings = [];
    for (const task of this.tasks.values()) {
      taskStrings.push(
        `ID: ${task.id}, Desc: '${task.description}', Priority: ${task.priority || 'N/A'}, Assigned To: ${task.assigned_to || 'N/A'}`
      );
    }
    return "Current Tasks:\n" + taskStrings.join("\n");
  }
}
