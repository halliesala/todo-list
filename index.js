// CONSTANTS
const newTaskForm = document.querySelector("#new-task-form");
const taskTable = document.querySelector('#task-table');
const priorityDropdown = document.querySelector("#priority");
const dueSortButton = document.querySelector('#due-sort');
const addedSortButton = document.querySelector('#added-sort');
const prioritySortButton = document.querySelector('#priority-sort');



/**
 * 
 * 
 * MAIN GET REQUEST:
 * 
 *  - Render tasks in table
 *  - Set up new task form to post to db, add to table
 *  - Add sort buttons
 * 
 */

// Get list of tasks from db
fetch('http://localhost:3000/tasks')
    .then(resp => resp.json())
    .then(taskObjArr => {
        
        // Render tasks in table
        taskObjArr.forEach(taskObj => addTaskObjToTable(taskObj));
        
        /**
         * 
         * NEW TASK FORM
         * 
         */

        // Autofill today's date in form due date field
        newTaskForm['due-date'].value = getFormattedDate();

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
                    'date-added': getDateInMS(),
                })
            }
            fetch('http://localhost:3000/tasks', POST_OPTIONS)
                .then(resp => resp.json())
                .then(newTaskObj => {
                    // If post is successful, append new obj to taskObjArr
                    taskObjArr.push(newTaskObj);
                    // Show new task in table
                    addTaskObjToTable(newTaskObj);
                    // Then, reset form
                    newTaskForm.reset();
                    newTaskForm['due-date'].value = getFormattedDate();
                })
        })

        /**
         * 
         * 
         * SORTING
         * 
         * sortEventHandler() sorts taskObjArr in place using the compare function 
         * and optional parameter passed in
         * 
         */

        
        function sortEventHandler(e, compareFunc, compareFuncParam) {
            // Replace all rows with just header row
            taskTable.replaceChildren(taskTable.firstElementChild);     
            taskObjArr.sort(compareFunc(compareFuncParam));             
            taskObjArr.forEach(taskObj => {
                addTaskObjToTable(taskObj)
            });
        }

        dueSortButton.addEventListener('click', (e) => sortEventHandler(e, numCompare, "due-date"));
        addedSortButton.addEventListener('click', (e) => sortEventHandler(e, numCompare, "date-added"));
        prioritySortButton.addEventListener('click', (e) => sortEventHandler(e, priorityCompare));


        /**
         * 
         * 
         * ADD ROWS TO TABLE
         * 
         * Builds and appends table row for taskObj
         * Directly handles updates to db / taskObjArr for priority dropdown, complete, and delete buttons
         * Calls getEditableTd() to return td node and handle updates to db / taskObjArr for due date, task, and notes
         * 
         */

        function addTaskObjToTable(taskObj) {

            // Store taskObj values in same-named variables
            // id and dateAdded should never change; other variables can be updated
            const {id} = taskObj;
            const dateAdded = taskObj['date-added'];
            let {task, priority, notes} = taskObj;
            let dueDate = taskObj['due-date'];
            let isDone = taskObj['is-done'];

            // We will append content to this row and then append the row to our table
            const newRow = document.createElement('tr');

            /**
             * 
             * DATE ADDED
             * 
             */

            // Date added TD
            const dateAddedTD = document.createElement('td');
            const dateAddedSpan = document.createElement('span');
            dateAddedSpan.textContent = formatDate(new Date(dateAdded));
            dateAddedTD.appendChild(dateAddedSpan);

            /**
             * 
             * PRIORITY
             * 
             */

            // Create priority td by cloning dropdown from new task form
            const priorityTD = document.createElement('td');
            const newPriorityDropdown = priorityDropdown.cloneNode();

            // Give new dropdown a unique ID
            newPriorityDropdown.setAttribute('id', `priority${id}`);
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
                fetch(`http://localhost:3000/tasks/${id}`, PATCH_OPTIONS)
                    .then(resp => resp.json())
                    .then(patchedTaskObj => {
                        /**
                         * We tried console.logging taskObjArr before and after updating it with the patchedTaskObj.
                         * However, the first console.log was coming out already updated -- we're confused!
                         * Commenting out the update line meant neither console.log showed a changed array, of course;
                         * We also checked that the event listener is only firing once. 
                         */

                        // Update taskObjArr with patched content
                        const idx = getArrIndexByObjID(taskObjArr, patchedTaskObj.id);
                        taskObjArr[idx] = patchedTaskObj;
                    });
            })
            priorityTD.appendChild(newPriorityDropdown);

            /**
             * 
             * TASK DESCRIPTION
             * 
             */
            const taskTD = getEditableTD(task, id, 'task', 'text');


            /**
             * 
             * COMPLETE / DONE BUTTON
             * 
             */

            // Add 'complete' button
            const isDoneTD = document.createElement('td');
            const completeButton = document.createElement('span');

            completeButton.textContent = isDone ? '✅' : '🔲';
            strikethroughIfDone(taskTD, isDone);

            // When complete button is clicked, we update db, strikethrough the whole line, & update button
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
        
                        // Update taskObjArr with patched content
                        const idx = getArrIndexByObjID(taskObjArr, patchedTaskObj.id);
                        taskObjArr[idx] = patchedTaskObj;

                        // Update complete button text and cross out row if done
                        completeButton.textContent = patchedTaskObj['is-done'] ? '✅' : '🔲';
                        strikethroughIfDone(taskTD, patchedTaskObj['is-done']);
                        isDone = !isDone;
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
            const deleteButton = document.createElement('button');
            deleteButton.textContent = "❌";

            // When clicked, button will remove row and fetch delete req to db
            deleteButton.addEventListener('click', () => {
                fetch(`http://localhost:3000/tasks/${id}`, { method: 'DELETE' })
                    .then(() => {
                        // Update taskObjArr with deleted content
                        const idx = getArrIndexByObjID(taskObjArr, id);
                        taskObjArr.splice(idx, 1);

                        // Update on screen
                        newRow.remove();
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
                getEditableTD(formatDate(new Date(dueDate)), id, 'due-date', 'date'),
                taskTD,
                priorityTD,
                isDoneTD,
                getEditableTD(notes, id, 'notes', 'text'),
                deleteTD
            );
            taskTable.append(newRow);
        }

        /**
         * 
         * 
         *  Returns an editable td node and handles updates to db and taskObjArr
         * 
         *  textContent -- content to appear in table
         *  id -- id of relevant taskObj
         *  patchKey -- taskObj key to patch edits to db
         *  inputType -- should be 'text' or 'date
         * 
         */

        function getEditableTD(textContent, id, patchKey, inputType) {
            const td = document.createElement('td');
            const span = document.createElement('span');
            span.textContent = textContent;
            td.appendChild(span);
            addEditButton(id, span, td, patchKey, inputType);
            return td;

            /**
             * 
             * 
             * Appends an edit button to td 
             * Click button to open edit form
             * Submit form to patch to db and change text on screen
             * 
             */

            function addEditButton(id, span, td, patchKey, inputType) {
                const editButton = document.createElement('button');
                editButton.textContent = ' ✏️ '
                td.append(editButton);
                if (inputType === 'text') {
                    // Set class attribute to allow left alignment in styles.css
                    td.setAttribute('class', 'left-align');
                }
                editButton.onclick = (editButtonEvent) => {
                    const editForm = document.createElement('form');
    
                    // User input (edit)
                    const input = document.createElement('input');
                    const editInputID = `input${id}${patchKey}`;
                    input.setAttribute('id', editInputID);
                    input.type = inputType;
                    input.value = span.textContent;
    
                    // Submit button
                    const submitButton = document.createElement('input');
                    submitButton.type = 'submit';
                    submitButton.value = '✅'
                    const submitButtonId = `button${id}{patchKey}`
                    submitButton.setAttribute('id', submitButtonId);
    
                    editForm.append(input, submitButton);
    
                    // Remove old content & edit button
                    span.remove();
                    editButtonEvent.target.remove();
    
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
                                // Update taskObjArr with patched content
                                const idx = getArrIndexByObjID(taskObjArr, patchedTaskObj.id);
                                taskObjArr[idx] = patchedTaskObj;
    
                                if (inputType === 'date') {
                                    // Convert epoch time to YYYY-MM-DD
                                    span.textContent = formatDate(new Date(patchedTaskObj[patchKey]));
                                } else {
                                    // Set class attribute to allow left alignment in styles.css
                                    td.setAttribute('class', 'left-align');
                                    span.textContent = patchedTaskObj[patchKey];
                                }
    
                                editForm.remove();
    
                                // Reappend text span and edit button
                                td.prepend(span);
                                td.append(editButtonEvent.target);
                            });
                    }
                }
            }
        }

    })





// FUNCTIONS
// These functions don't need access to taskObjArr


// If isDone, strikethrough node
function strikethroughIfDone(node, isDone) {
    isDone ? node.style.textDecoration = "line-through" : node.style.textDecoration = '';
}

// Takes an array of objects; returns idx of object with id
function getArrIndexByObjID(objArr, id) {
    // Loop through array and check obj.id against id; if match, return idx
    for (const [idx, obj] of objArr.entries()) {
        if (obj.id === id) {
            return idx;
        }
    }
}

/**
 * 
 *  Sort compare functions + state variables
 * 
 *  NOTE: We tried writing this a couple of ways, and are confused
 *  that this one works while others didn't. 
 * 
 * For example, the following does not work when passed as callback 
 * in taskObjArr.sort(dueDateCompare):
 * 
 * let toggle = false;
 * function dueDateCompare(a, b) {
        const aMS = a["due-date"];
        const bMS = b["due-date"];
        toggle = !toggle;
        return !toggle ? aMS - bMS : bMS - aMS; 
    }
* 
* */ 

// State variable -- toggle between ascending & descending sorts
const toggle = {
    'due-date': false,
    'date-added': false,
    'priority': false,
};

// Returns ascending or descending compareTo function for numerical comparisons
function numCompare(key) {
    function numCompAsc(a, b) {
        const aMS = a[key];
        const bMS = b[key];
        return aMS - bMS;
    }

    function numCompDesc(a, b) {
        return numCompAsc(b, a)
    }
    toggle[key] = !toggle[key];
    return !toggle[key] ? numCompAsc : numCompDesc;
}

// Returns ascending or descending compareTo function for priority comparison
function priorityCompare() {
    const priorityMap = { 'High': 3, 'Medium': 2, 'Low': 1 };
    function priorityCompareAsc(a, b) {
        const aPri = priorityMap[a.priority];
        const bPri = priorityMap[b.priority];
        return aPri - bPri;
    }
    function priorityCompareDesc(a, b) {
        return priorityCompareAsc(b, a);
    }
    toggle[priority] = !toggle[priority];
    return !toggle[priority] ? priorityCompareAsc : priorityCompareDesc;
}

/**
 * 
 * Dates
 */

// Returns current date as string `YYYY-mm-dd`
function getFormattedDate() {
    return formatDate(new Date());
}

// Returns dateObj as string `YYYY-mm-dd'
// We use .getUTC methods to ensure dates appear as entered by user, without timezone conversions
function formatDate(dateObj) {
    const year = dateObj.getUTCFullYear();
    const month = (dateObj.getUTCMonth() + 1).toString().padStart(2, '0');
    const date = (dateObj.getUTCDate()).toString().padStart(2, '0');
    return `${year}-${month}-${date}`;
}

// Returns current epoch time
function getDateInMS(date) {
    return (new Date()).getTime();
}