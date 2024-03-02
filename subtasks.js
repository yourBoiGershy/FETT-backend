function locateSubtaskArray(tasks, parentID) {
    // Function to recursively search for the object with the specified parentID
    function findSubtaskArray(tasksArray, id) {
        for (let task of tasksArray) {
            if (task.id === id) {
                return task.subtasks; // Return the subtasks array of the found task
            }
            if (task.subtasks && task.subtasks.length > 0) {
                const result = findSubtaskArray(task.subtasks, id);
                if (result) return result; // If found in nested subtasks, return the result
            }
        }
        return null; // If not found, return null
    }

    // Start the recursive search from the root tasks array
    return findSubtaskArray(tasks, parentID);
}

// Example usage
const subtasks = [
    {
        id: 1,
        parentId: 0,
        name: "Subtask 1",
        description: "This is a subtask",
        status: "In Progress",
        subtasks: [
            {
                id: 5,
                name: "Subtask 5",
                description: "This is a subtask",
                status: "In Progress",
                subtasks: []
            },
            {
                id: 6,
                name: "Subtask 6",
                description: "This is a subtask",
                status: "In Progress",
                subtasks: [{
                    id: 7,
                    name: "Subtask 7",
                    description: "This is a subtask",
                    status: "In Progress",
                    subtasks: []
                }]
            }
        ]
    },
    {
        id: 2,
        name: "Subtask 2",
        description: "This is a subtask",
        status: "In Progress",
        subtasks: [
            {
                id: 3,
                name: "Subtask 3",
                description: "This is a subtask",
                status: "In Progress",
                subtasks: []
            },
            {
                id: 4,
                parentId: 2,
                name: "Subtask 4",
                description: "This is a subtask",
                status: "In Progress",
                subtasks: []
            }
        ]
    }
];

const parentID = 2;
const result = locateSubtaskArray(subtasks, parentID);
console.log(result);