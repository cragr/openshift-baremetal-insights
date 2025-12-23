package store

import (
	"testing"

	"github.com/cragr/openshift-baremetal-insights/internal/models"
)

func TestTaskStore_SetAndGet(t *testing.T) {
	ts := NewTaskStore()
	task := models.Task{
		TaskID:    "JID_123",
		Node:      "node-1",
		TaskState: models.TaskRunning,
	}
	ts.SetTask(task)

	got, ok := ts.GetTask("JID_123")
	if !ok {
		t.Fatal("GetTask returned false, expected true")
	}
	if got.Node != "node-1" {
		t.Errorf("Node = %v, want node-1", got.Node)
	}
}

func TestTaskStore_ListTasks(t *testing.T) {
	ts := NewTaskStore()
	ts.SetTask(models.Task{TaskID: "JID_1", Node: "node-1", Namespace: "ns-a"})
	ts.SetTask(models.Task{TaskID: "JID_2", Node: "node-2", Namespace: "ns-b"})

	// All tasks
	tasks := ts.ListTasks("")
	if len(tasks) != 2 {
		t.Errorf("ListTasks() = %d tasks, want 2", len(tasks))
	}

	// Filtered by namespace
	tasks = ts.ListTasks("ns-a")
	if len(tasks) != 1 {
		t.Errorf("ListTasks(ns-a) = %d tasks, want 1", len(tasks))
	}
}

func TestTaskStore_DeleteTask(t *testing.T) {
	ts := NewTaskStore()
	ts.SetTask(models.Task{TaskID: "JID_1"})
	ts.DeleteTask("JID_1")

	_, ok := ts.GetTask("JID_1")
	if ok {
		t.Error("GetTask returned true after delete")
	}
}

func TestTaskStore_ClearCompleted(t *testing.T) {
	ts := NewTaskStore()
	ts.SetTask(models.Task{TaskID: "JID_1", TaskState: models.TaskRunning})
	ts.SetTask(models.Task{TaskID: "JID_2", TaskState: models.TaskCompleted})
	ts.SetTask(models.Task{TaskID: "JID_3", TaskState: models.TaskFailed})

	ts.ClearCompleted()

	tasks := ts.ListTasks("")
	if len(tasks) != 1 {
		t.Errorf("After ClearCompleted: got %d tasks, want 1", len(tasks))
	}
}
