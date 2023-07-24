// CONSTANTS
const newTaskForm = document.querySelector("#new-task-form");
const taskTable = document.querySelector('#task-table');

// Get list of tasks from db & render in table
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
                'is-done': false,
                'notes': notes,
            })
        }

        fetch('http://localhost:3000/tasks', POST_OPTIONS)
        .then(resp => resp.json())
        .then(newTaskObj => {
            // If post is successful, show new task in table
            addTaskObjToTable(newTaskObj);
            // Then, reset form
            newTaskForm.reset();
        })
    })
})







// FUNCTIONS

// Builds and appends table row
function addTaskObjToTable(taskObj) {
    addTaskToTable(taskObj.id, taskObj['due-date'], taskObj.task, taskObj.priority, taskObj['is-done'], taskObj.notes);
}

// Builds and appends table row
function addTaskToTable(id, dueDate, task, priority, isDone, notes) {
    const newRow = document.createElement('tr');

    // Due date field -- we will update this to a date
    const dueDateTD = document.createElement('td');
    const dueDateSpan = document.createElement('span');
    dueDateSpan.textContent = dueDate;
    dueDateTD.appendChild(dueDateSpan);

    // Priority field -- we will update this to a dropdown
    const priorityTD = document.createElement('td');
    const prioritySpan = document.createElement('span');
    prioritySpan.textContent = priority;
    priorityTD.appendChild(prioritySpan);
    

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


    // Fill out row and append to table
    newRow.append(dueDateTD, getEditableTD(task, id, "task"), priorityTD, isDoneTD, getEditableTD(notes, id, "notes"), deleteTD);
    taskTable.append(newRow);
}

function strikethroughIfDone(node, isDone) {
    isDone ? node.style.textDecoration = "line-through" : node.style.textDecoration = '';
}


function getEditableTD(textContent, id, patchKey) {
    const td = document.createElement('td');
    const span = document.createElement('span');
    span.textContent = textContent;
    td.appendChild(span);
    addEditButton(id, span, td, patchKey);
    return td;
}

// Appends an edit button to node
// Click button to open edit form 
// Submit form to patch to db and change text on screen
function addEditButton(id, span, td, patchKey) {
    const editButton = document.createElement('button');
    editButton.textContent = ' ✏️ '
    td.append(editButton);
    editButton.onclick = () => {
        const editForm = document.createElement('form');
        const input = document.createElement('input');
        input.setAttribute('id', 'textInput');
        input.type = 'text';
        input.value = span.textContent;
        editForm.appendChild(input);
        // Remove old content
        span.remove();
        td.prepend(editForm);

        editForm.onsubmit = (e) => {
            e.preventDefault();
            const PATCH_OPTIONS = {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({
                    [patchKey]: e.target.textInput.value,
                })
            }
            fetch(`http://localhost:3000/tasks/${id}`, PATCH_OPTIONS)
            .then(resp => resp.json())
            .then(patchedTaskObj => {
                span.textContent = patchedTaskObj[patchKey];
                editForm.remove();
                td.prepend(span);
            });
        }
    }
}