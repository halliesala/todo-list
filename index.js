// CONSTANTS
const newTaskForm = document.querySelector("#new-task-form");
const taskTable = document.querySelector('#task-table');
const priorityDropdown = document.querySelector("#priority");


// MAIN

// Get list of tasks from db
fetch('http://localhost:3000/tasks')
.then(resp => resp.json())
.then(taskObjArr => {
    // Autofill today's date in form due date field
    newTaskForm['due-date'].value = getFormattedDate();

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
                'date-added': getFormattedDate(),
            })
        }

        fetch('http://localhost:3000/tasks', POST_OPTIONS)
        .then(resp => resp.json())
        .then(newTaskObj => {
            // If post is successful, show new task in table
            addTaskObjToTable(newTaskObj);
            // Then, reset form
            newTaskForm.reset();
            newTaskForm['due-date'].value = getFormattedDate();
        })
    })
})



// FUNCTIONS

// Returns a string 'YYYY-MM-DD'
function getFormattedDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const date = (now.getDate()).toString().padStart(2, '0');
    return `${year}-${month}-${date}`;
}

// Builds and appends table row
function addTaskObjToTable(taskObj) {
    addTaskToTable(taskObj.id, taskObj['due-date'], taskObj.task, taskObj.priority, taskObj['is-done'], taskObj.notes, taskObj['date-added']);
}

// Builds and appends table row
function addTaskToTable(id, dueDate, task, priority, isDone, notes, dateAdded) {
    const newRow = document.createElement('tr');

    // Priority field 
    const priorityTD = document.createElement('td');
    const newPriorityDropdown = priorityDropdown.cloneNode();
    priorityDropdown.childNodes.forEach(child => {
        const newChild = child.cloneNode();
        newChild.textContent = child.textContent;
        // Drop down should be set to user-selected value
        if (child.value === priority) {
            newChild.setAttribute("selected", true);
        }
        newPriorityDropdown.appendChild(newChild);
    });
    // When priority changed, patch to db
    newPriorityDropdown.addEventListener('change', (e) => {
        console.log(e.target.value);
        const PATCH_OPTIONS = {
            method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({
                    "priority" : e.target.value,
                })
        }
        // No .then() -- we're rendering optimistically and the response is not used
        fetch(`http://localhost:3000/tasks/${id}`, PATCH_OPTIONS);
    })
    priorityTD.appendChild(newPriorityDropdown);

    

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
    deleteButton.textContent = "❌";

    // When clicked, button will remove row and fetch delete req to db
    deleteButton.addEventListener('click', () => {
        fetch(`http://localhost:3000/tasks/${id}`, {method: 'DELETE'})
        .then(() => {
            newRow.remove();
        });
    })
    deleteTD.appendChild(deleteButton);

    
    // Date added TD
    const dateAddedTD = document.createElement('td');
    const dateAddedSpan = document.createElement('span');
    dateAddedSpan.textContent = dateAdded;
    dateAddedTD.appendChild(dateAddedSpan);


    // Fill out row and append to table
    newRow.append(
                    dateAddedTD,
                    getEditableTD(dueDate, id, "due-date", 'date'), 
                    getEditableTD(task, id, "task", 'text'), 
                    priorityTD,
                    isDoneTD, 
                    getEditableTD(notes, id, "text"), 
                    deleteTD
                );
    taskTable.append(newRow);
}

function strikethroughIfDone(node, isDone) {
    isDone ? node.style.textDecoration = "line-through" : node.style.textDecoration = '';
}

function getEditableTD(textContent, id, patchKey, inputType) {
    const td = document.createElement('td');
    const span = document.createElement('span');
    span.textContent = textContent;
    td.appendChild(span);
    addEditButton(id, span, td, patchKey, inputType);
    return td;
}

// Appends an edit button to node
// Click button to open edit form 
// Submit form to patch to db and change text on screen
function addEditButton(id, span, td, patchKey, inputType) {
    const editButton = document.createElement('button');
    editButton.textContent = ' ✏️ '
    td.append(editButton);
    editButton.onclick = (editButtonEvent) => {
        const editForm = document.createElement('form');

        // User input (edit)
        const input = document.createElement('input');
        input.setAttribute('id', 'userInput');
        input.type = inputType;
        input.value = span.textContent;

        // Submit button
        const submitButton = document.createElement('input');
        submitButton.type = 'submit';
        submitButton.value = '✅'
        submitButton.setAttribute('id', 'submit-button');

        editForm.append(input, submitButton);

        // Remove old content & edit button
        span.remove();
        editButtonEvent.target.remove();

        // Replace with edit form (and submit button)
        td.prepend(editForm);

        // When form is submitted, edits patch to db and appear on screen
        editForm.onsubmit = (editFormEvent) => {
            editFormEvent.preventDefault();
            const PATCH_OPTIONS = {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({
                    [patchKey]: editFormEvent.target.userInput.value,
                })
            }
            fetch(`http://localhost:3000/tasks/${id}`, PATCH_OPTIONS)
            .then(resp => resp.json())
            .then(patchedTaskObj => {
                span.textContent = patchedTaskObj[patchKey];

                editForm.remove();

                // Reappend text span and edit button
                td.prepend(span);
                td.append(editButtonEvent.target);
            });
        }
    }
}

