// CONSTANTS
const newTaskForm = document.querySelector("#new-task-form");
const taskTable = document.querySelector('#task-table');


// MAIN

// Get list of tasks from db
fetch('http://localhost:3000/tasks')
.then(resp => resp.json())
.then(taskObjArr => {

    // Render tasks in table
    taskObjArr.forEach(taskObj => addTaskObjToTable(taskObj));

    // When form is submitted, post task to db and render in table
    newTaskForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const dueDate = e.target['due-date'].value;
    const task = e.target['task'].value;
    const priority = e.target['priority'].value;
    const isDone = e.target['done'].value;
    const notes = e.target['notes'].value;

    // Post new task to db
    const POST_OPTIONS = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
        body: JSON.stringify({
            'due-date': dueDate,
            'task': task,
            'priority': priority,
            'is-done': isDone,
            'notes': notes,
        })
    }

    fetch('http://localhost:3000/tasks', POST_OPTIONS)
    .then(resp => resp.json())
    .then(newTaskObj => {
        // If post is successful, show new task in table
        addTaskToTable(newTaskObj.id, dueDate, task, priority, isDone, notes);
        // Then, reset form
        newTaskForm.reset();
    })
})
})







// FUNCTIONS

function addTaskObjToTable(taskObj) {
    addTaskToTable(taskObj.id, taskObj['due-date'], taskObj.task, taskObj.priority, taskObj['is-done'], taskObj.notes);
}

function addTaskToTable(id, dueDate, task, priority, isDone, notes) {
    const newRow = document.createElement('tr');

    const dueDateTD = document.createElement('td');
    const dueDateSpan = document.createElement('span');
    dueDateSpan.textContent = dueDate;
    dueDateTD.appendChild(dueDateSpan);
    addEditButton(id, dueDateSpan, dueDateTD);

    const taskTD = document.createElement('td');
    const taskSpan = document.createElement('span');
    taskSpan.textContent = task;
    taskTD.appendChild(taskSpan);
    addEditButton(id, taskSpan, taskTD);

    const priorityTD = document.createElement('td');
    priorityTD.textContent = priority;

    // Add 'complete' button
    const isDoneTD = document.createElement('td');
    const completeButton = document.createElement('button');
    completeButton.textContent = isDone ? 'DONE' : 'NOT DONE';
    strikethroughIfDone(newRow, isDone);
    // When button is clicked, we update db, strikethrough the whole line, & update button
    completeButton.addEventListener('click', () => {
        const PATCH_OPTIONS = {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                "is-done": !isDone
            })
        }
        fetch(`http://localhost:3000/tasks/${id}`, PATCH_OPTIONS)
        .then(resp => resp.json())
        .then(patchedTaskObj => {
            completeButton.textContent = patchedTaskObj['is-done'] ? 'DONE' : 'NOT DONE';
            strikethroughIfDone(newRow, patchedTaskObj['is-done']);
            isDone = !isDone;
        });
    })
    isDoneTD.appendChild(completeButton);

    const notesTD = document.createElement('td');
    notesTD.textContent = notes;

    // Add delete button
    const deleteTD = document.createElement('td');
    const deleteButton = document.createElement('button');
    deleteButton.textContent = " ❌ ";
    // When clicked, button will remove row and fetch delete req to db
    deleteButton.addEventListener('click', () => {
        fetch(`http://localhost:3000/tasks/${id}`, {method: 'DELETE'})
        .then(() => {
            newRow.remove();
        });
    })
    deleteTD.appendChild(deleteButton);

    

    newRow.append(dueDateTD, taskTD, priorityTD, isDoneTD, notesTD, deleteTD);
    taskTable.append(newRow);


}

function strikethroughIfDone(node, isDone) {
    isDone ? node.style.textDecoration = "line-through" : node.style.textDecoration = '';
}

// Appends an edit button to node
// Click button to open edit form 
// Submit form to patch to db and change text on screen
function addEditButton(id, span, td) {
    const editButton = document.createElement('button');
    editButton.textContent = ' ✏️ '
    td.append(editButton);
    // Make task editable -- click 'edit' button to open edit form
    // Finally, render updates on screen
    editButton.addEventListener('click', () => {
        const editForm = document.createElement('form');
        const input = document.createElement('input');
        input.setAttribute('id', 'textInput');
        input.type = 'text';
        input.value = span.textContent;
        editForm.appendChild(input);
        // Hide task content
        span.remove();
        td.prepend(editForm);

        editForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const PATCH_OPTIONS = {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({
                    "task": e.target.textInput.value,
                })
            }
            fetch(`http://localhost:3000/tasks/${id}`, PATCH_OPTIONS)
            .then(resp => resp.json())
            .then(patchedTaskObj => {
                const editedSpan = document.createElement('span');
                editedSpan.textContent = patchedTaskObj.task;
                editForm.remove();
                td.prepend(editedSpan);
            });

        })
    })
}