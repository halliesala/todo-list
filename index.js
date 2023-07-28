// CONSTANTS
const PRIORITY_MAP = { 'High': 3, 'Medium': 2, 'Low': 1 };

// NODE CONSTANTS
const newTaskForm = document.querySelector("#new-task-form");
const taskTable = document.querySelector('#task-table');
const priorityDropdown = document.querySelector("#priority");
const dueSortButton = document.querySelector('#due-sort');
const addedSortButton = document.querySelector('#added-sort');
const prioritySortButton = document.querySelector('#priority-sort');
const editIcon = document.querySelector('#edit-icon');

// IMAGE FILEPATH CONSTANTS
const EMPTY_CHECKBOX_SRC = 'images/checkbox-empty.svg';
const GREEN_CHECK_SRC = 'images/green_check.png';
const DELETE_ICON_SRC = 'images/delete_icon.png'

// STATE VARIABLES
let editMode = true;
let editFormOpen = false;

// CLASSES
class Task {
    constructor(taskDataObj) {
        this.dueDate = taskDataObj['due-date'];
        this.task = taskDataObj['task'];
        this.priority = taskDataObj['priority'];
        this.isDone = taskDataObj['is-done'];
        this.notes = taskDataObj['notes'];
        this.dateAdded = taskDataObj['date-added'];
        this.id = taskDataObj['id'];
    }
    get dueDateYMD() {
        return formatDateFromMs(this.dueDate);
    }
    get dateAddedYMD() {
        return formatDateFromMs(this.dateAdded);
    }
}

class TaskArray extends Array {
    sortByDueDateAsc() { this.sort((a, b) => a.dueDate - b.dueDate) };
    sortByDueDateDesc() { this.sort((a, b) => b.dueDate - a.dueDate) };
    sortByDateAddedAsc() { this.sort((a, b) => a.dateAdded - b.dateAdded) };
    sortByDateAddedDesc() { this.sort((a, b) => b.dateAdded - a.dateAdded) };
    sortByPriorityAsc() { this.sort((a, b) => PRIORITY_MAP[a.priority] - PRIORITY_MAP[b.priority]) };
    sortByPriorityDesc() { this.sort((a, b) => PRIORITY_MAP[b.priority] - PRIORITY_MAP[a.priority]) };

    // Clear table except for header, then add rows
    renderTable() {
        taskTable.replaceChildren(taskTable.firstElementChild);
        this.forEach(task => addTaskToTable(task, this));
    }
    getIndexOfID(id) {
        return this.findIndex(task => task.id === id);
    }
    // Replaces the task with the same ID
    updateTask(updatedTask) {
        const idx = this.getIndexOfID(updatedTask.id);
        console.log(`ID to update: ${updatedTask.id}`);
        console.log(`Index to update: ${idx}`);
        console.log(`Updated task: ${updatedTask.task}`);
        console.log(`Original task: ${this[idx].task}`);
        this[idx] = updatedTask;
    }
}

// FUNCTIONS

// If task complete, format table row
function formatIfDone(taskTD, row, isDone) {
    if (isDone) {
        taskTD.classList.add('complete-task');
        row.classList.add('complete-row');
    } else {
        taskTD.classList.remove('complete-task');
        row.classList.remove('complete-row');
    }
}

// Returns current date as string `YYYY-mm-dd`
function getCurrentDateYMD() {
    return formatDateFromMs((new Date()).getTime());
}

// Takes an epoch date in MS and returns string `YYYY-mm-dd'
function formatDateFromMs(dateInMS) {
    const dateObj = new Date(dateInMS);
    const year = dateObj.getUTCFullYear();
    const month = (dateObj.getUTCMonth() + 1).toString().padStart(2, '0');
    const date = (dateObj.getUTCDate()).toString().padStart(2, '0');
    return `${year}-${month}-${date}`;
}

// Returns an editable td node and handles updates to db and taskArray
function getEditableTD(textContent, id, patchKey, inputType, taskArray) {
    const td = document.createElement('td');
    const span = document.createElement('span');

    // Left align editable text elements; otherwise center align
    if (inputType === 'text') {
        td.classList.add('left-align');
    }

    span.textContent = textContent;
    td.appendChild(span);
    //addEditButton(id, span, td, patchKey, inputType);
    td.onclick = (editTDEvent) => {

        // Check if edit form is already open; if so, don't open another
        if (editFormOpen || !editMode) return;
        editFormOpen = !editFormOpen;

        const editForm = document.createElement('form');
        editForm.classList.add('grow-wrap');

        // Submit button
        const submitButton = document.createElement('input');
        submitButton.type = 'submit';
        const submitButtonId = `button${id}${patchKey}`;
        submitButton.setAttribute('id', submitButtonId);


        // User input 
        let input;
        if (inputType === 'text') {
            input = document.createElement('textarea');
            input.textContent = span.textContent;
            submitButton.classList.add('submit-text-edits');
        } else if (inputType === 'date') {
            input = document.createElement('input');
            input.type = inputType;
            input.value = span.textContent;
            submitButton.classList.add('submit-date-edits')
        }
        const editInputID = `input${id}${patchKey}`;
        input.setAttribute('id', editInputID);


        editForm.append(input, submitButton);

        // Remove old content & edit button
        span.remove();

        // Replace with edit form (and submit button)
        td.prepend(editForm);

        // When form is submitted, edits patch to db and appear on screen
        editForm.onsubmit = (editFormEvent) => {
            editFormEvent.preventDefault();

            // If user input is date, convert to milliseconds
            if (inputType === 'date') {
                const inMS = (new Date(editFormEvent.target[editInputID].value)).getTime();
                body = inMS;
            } else {
                // Otherwise we patch exactly what the user submitted

                body = editFormEvent.target[editInputID].value;
            }

            const PATCH_OPTIONS = {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({
                    [patchKey]: body,
                })
            }
            fetch(`http://localhost:3000/tasks/${id}`, PATCH_OPTIONS)
                .then(resp => resp.json())
                .then(patchedTaskObj => {
                    const patchedTask = new Task(patchedTaskObj);
                    taskArray.updateTask(patchedTask);

                    editForm.remove();
                    editFormOpen = !editFormOpen;

                    taskArray.renderTable();
                });
        }
    }
    return td;
}

// Add taskObj to table as row
function addTaskToTable(task, taskArray) {
    // We will append content to this row and then append the row to our table
    const newRow = document.createElement('tr');

    // Date added TD
    const dateAddedTD = document.createElement('td');
    const dateAddedSpan = document.createElement('span');
    dateAddedSpan.textContent = task.dateAddedYMD;
    dateAddedTD.appendChild(dateAddedSpan);

    // Create priority td by cloning dropdown from new task form
    const priorityTD = document.createElement('td');
    const newPriorityDropdown = priorityDropdown.cloneNode();

    // Give new priority dropdown a unique ID
    newPriorityDropdown.setAttribute('id', `priority${task.id}`);
    priorityDropdown.childNodes.forEach(child => {
        const newChild = child.cloneNode();
        newChild.textContent = child.textContent;
        // Drop down should be set to user-selected value
        if (child.value === task.priority) {
            newChild.setAttribute("selected", true);
        }
        newPriorityDropdown.appendChild(newChild);
    });

    // When priority changed, patch to db
    newPriorityDropdown.addEventListener('change', (e) => {
        const PATCH_OPTIONS = {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                "priority": e.target.value,
            })
        }
        fetch(`http://localhost:3000/tasks/${task.id}`, PATCH_OPTIONS)
            .then(resp => resp.json())
            .then(patchedTaskObj => {
                const patchedTask = new Task(patchedTaskObj);
                taskArray.updateTask(patchedTask);

                taskArray.renderTable();
            });
    })
    priorityTD.appendChild(newPriorityDropdown);

    /**
     * 
     * TASK DESCRIPTION
     * 
     */
    const taskTD = getEditableTD(task.task, task.id, 'task', 'text', taskArray);


    /**
     * 
     * COMPLETE / DONE BUTTON
     * 
     */

    const isDoneTD = document.createElement('td');
    const completeButton = document.createElement('img');
    completeButton.setAttribute('class', 'checkbox-img');
    completeButton.src = task.isDone ? GREEN_CHECK_SRC : EMPTY_CHECKBOX_SRC;
    formatIfDone(taskTD, newRow, task.isDone);

    // When complete button is clicked, we update db & taskObjArr and render changes
    completeButton.addEventListener('click', (e) => {
        const PATCH_OPTIONS = {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                "is-done": !task.isDone
            })
        }
        fetch(`http://localhost:3000/tasks/${task.id}`, PATCH_OPTIONS)
            .then(resp => resp.json())
            .then(patchedTaskObj => {
                const patchedTask = new Task(patchedTaskObj);
                taskArray.updateTask(patchedTask);
                taskArray.renderTable();
            });
    })
    isDoneTD.appendChild(completeButton);


    /**
     * 
     * DELETE BUTTON
     * 
     */

    // Add delete button
    const deleteTD = document.createElement('td');
    const deleteButton = document.createElement('img');
    deleteButton.setAttribute('class', 'delete-button');
    deleteButton.src = DELETE_ICON_SRC;

    // When clicked, button will remove row and fetch delete req to db
    deleteButton.addEventListener('click', () => {
        fetch(`http://localhost:3000/tasks/${task.id}`, { method: 'DELETE' })
            .then(() => {
                // Update taskObjArr with deleted content
                const idx = taskArray.getIndexOfID(task.id);
                taskArray.splice(idx, 1);

                // Update on screen
                // newRow.remove();
                taskArray.renderTable();
            });
    })
    deleteTD.appendChild(deleteButton);


    /**
     * 
     * BUILD ROW AND APPEND TO TABLE
     * 
     * Function getEditableTD() returns a td node & sets event handlers for edit functionality
     * 
     */


    newRow.append(
        dateAddedTD,
        getEditableTD(task.dueDateYMD, task.id, 'due-date', 'date', taskArray),
        taskTD,
        priorityTD,
        isDoneTD,
        getEditableTD(task.notes, task.id, 'notes', 'text', taskArray),
        deleteTD
    );
    taskTable.append(newRow);
}





// MAIN
fetch('http://localhost:3000/tasks')
    .then(resp => resp.json())
    .then(taskDataArr => {

        // PAGE SET-UP
        const taskArray = new TaskArray();
        taskDataArr.forEach(taskDataObj => taskArray.push(new Task(taskDataObj)));
        //renderTable(taskArray);
        taskArray.renderTable();

        // EDIT MODE
        editIcon.addEventListener('click', () => {
            if (editMode) {
                // Hide edit instructions & remove highlight
                editIcon.classList.add('read-mode')
                editIcon.classList.remove('edit-mode');
            } else {
                // Show edit instructions & highlight edit icon
                editIcon.classList.add('edit-mode');
                editIcon.classList.remove('read-mode');
            }
            editMode = !editMode;
        });

        // NEW TASK FORM
        // Autofill today's date in new task form due date field
        newTaskForm['due-date'].value = getCurrentDateYMD();

        // When form is submitted, post task to db and render in table
        newTaskForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const dueDate = (new Date(e.target['due-date'].value)).getTime();
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
                    'date-added': (new Date()).getTime(),
                })
            }
            fetch('http://localhost:3000/tasks', POST_OPTIONS)
                .then(resp => resp.json())
                .then(newTaskDataObj => {
                    // If post is successful, add task to taskArray & rerender table
                    const newTask = new Task(newTaskDataObj);
                    taskArray.push(newTask);
                    taskArray.renderTable();
                    // Then, reset form
                    newTaskForm.reset();
                    newTaskForm['due-date'].value = getCurrentDateYMD();
                })
        });

        // ENABLE SORTING
        let dueSortToggle = false;
        dueSortButton.addEventListener('click', () => {
            dueSortToggle ? taskArray.sortByDueDateAsc() : taskArray.sortByDueDateDesc();
            dueSortToggle = !dueSortToggle;
            taskArray.renderTable();
        });

        let addedSortToggle = false;
        addedSortButton.addEventListener('click', () => {
            addedSortToggle ? taskArray.sortByDateAddedAsc() : taskArray.sortByDateAddedDesc();
            addedSortToggle = !addedSortToggle;
            taskArray.renderTable();
        });

        let prioritySortToggle = false;
        prioritySortButton.addEventListener('click', () => {
            prioritySortToggle ? taskArray.sortByPriorityAsc() : taskArray.sortByPriorityDesc();
            prioritySortToggle = !prioritySortToggle;
            taskArray.renderTable();
        });
    });

