// CONSTANTS
const newTaskForm = document.querySelector("#new-task-form");
const taskTable = document.querySelector('#task-table');
const priorityDropdown = document.querySelector("#priority");
const dueSortButton = document.querySelector('#due-sort');
const addedSortButton = document.querySelector('#added-sort');
const prioritySortButton = document.querySelector('#priority-sort');


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

        // Sort by date added
        dueSortButton.addEventListener('click', (e) => {
            // Save headers
            const tableHeaders = taskTable.firstElementChild;
            // Clear table
            taskTable.replaceChildren(tableHeaders);
            // Sort taskObjArr by date added
            taskObjArr.sort(numCompare("due-date"));
            // Append rows to table in that order
            taskObjArr.forEach(taskObj => {
                addTaskObjToTable(taskObj)
            });
        });
        addedSortButton.addEventListener('click', (e) => {
            // Save headers
            const tableHeaders = taskTable.firstElementChild;
            // Clear table
            taskTable.replaceChildren(tableHeaders);
            // Sort taskObjArr by date added
            taskObjArr.sort(numCompare("date-added"));
            // Append rows to table in that order
            taskObjArr.forEach(taskObj => {
                addTaskObjToTable(taskObj);
            });
        })

        prioritySortButton.addEventListener('click', () => {
            // Save headers
            const tableHeaders = taskTable.firstElementChild;
            // Clear table
            taskTable.replaceChildren(tableHeaders);
            // Sort taskObjArr by date added
            taskObjArr.sort(priorityCompare());
            // Append rows to table in that order
            taskObjArr.forEach(taskObj => {
                addTaskObjToTable(taskObj);
            })
        })


        // FUNCTIONS
        // We're putting these inside our main fetch to allow access to taskObjArr

        function getArrIndexByObjID(objArr, id) {
            // Loop through array and check obj.id against id; if match, return idx
            for (const [idx, obj] of objArr.entries()) {
                if (obj.id === id) {
                    return idx;
                }
            }
        }

        /**
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

        // Toggle between ascending & descending sorts
        const toggle = {
            'due-date': false,
            'date-added': false,
            'priority': false,
        };

        // Returns ascending or descending compareTo function for numerical comparisons
        function numCompare(key) {
            function dueDateCompAsc(a, b) {
                const aMS = a[key];
                const bMS = b[key];
                return aMS - bMS;
            }

            function dueDateCompDesc(a, b) {
                return dueDateCompAsc(b, a)
            }
            toggle[key] = !toggle[key];
            return !toggle[key] ? dueDateCompAsc : dueDateCompDesc;
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



        // Returns a string 'YYYY-MM-DD'
        function getFormattedDate() {
            return formatDate(new Date());
        }

        function formatDate(dateObj) {
            const year = dateObj.getFullYear();
            const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
            const date = (dateObj.getDate()).toString().padStart(2, '0');
            return `${year}-${month}-${date}`;
        }

        function getDateInMS(date) {
            return (new Date()).getTime();
        }

        function mSToFormattedDate() {

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
        
                        // Update taskObjArr with patched content
                        const idx = getArrIndexByObjID(taskObjArr, patchedTaskObj.id);
                        taskObjArr[idx] = patchedTaskObj;

                        // Update complete button text and cross out row if done
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


            // Date added TD
            const dateAddedTD = document.createElement('td');
            const dateAddedSpan = document.createElement('span');
            dateAddedSpan.textContent = formatDate(new Date(dateAdded));
            dateAddedTD.appendChild(dateAddedSpan);

            

            // Fill out row and append to table
            newRow.append(
                dateAddedTD,
                getEditableTD(formatDate(new Date(dueDate)), id, "due-date", 'date'),
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

                            span.textContent = patchedTaskObj[patchKey];

                            editForm.remove();

                            // Reappend text span and edit button
                            td.prepend(span);
                            td.append(editButtonEvent.target);
                        });
                }
            }
        }
    })






