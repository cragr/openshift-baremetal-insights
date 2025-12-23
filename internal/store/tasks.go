package store

import (
	"sync"

	"github.com/cragr/openshift-baremetal-insights/internal/models"
)

// TaskStore provides thread-safe storage for Redfish tasks
type TaskStore struct {
	mu    sync.RWMutex
	tasks map[string]models.Task
}

// NewTaskStore creates a new TaskStore
func NewTaskStore() *TaskStore {
	return &TaskStore{
		tasks: make(map[string]models.Task),
	}
}

// SetTask adds or updates a task
func (ts *TaskStore) SetTask(task models.Task) {
	ts.mu.Lock()
	defer ts.mu.Unlock()
	ts.tasks[task.TaskID] = task
}

// GetTask retrieves a task by ID
func (ts *TaskStore) GetTask(id string) (models.Task, bool) {
	ts.mu.RLock()
	defer ts.mu.RUnlock()
	task, ok := ts.tasks[id]
	return task, ok
}

// ListTasks returns all tasks, optionally filtered by namespace
func (ts *TaskStore) ListTasks(namespace string) []models.Task {
	ts.mu.RLock()
	defer ts.mu.RUnlock()

	result := make([]models.Task, 0, len(ts.tasks))
	for _, task := range ts.tasks {
		if namespace == "" || task.Namespace == namespace {
			result = append(result, task)
		}
	}
	return result
}

// DeleteTask removes a task by ID
func (ts *TaskStore) DeleteTask(id string) {
	ts.mu.Lock()
	defer ts.mu.Unlock()
	delete(ts.tasks, id)
}

// ClearCompleted removes all completed tasks
func (ts *TaskStore) ClearCompleted() {
	ts.mu.Lock()
	defer ts.mu.Unlock()
	for id, task := range ts.tasks {
		if task.IsComplete() {
			delete(ts.tasks, id)
		}
	}
}
