// Author: Jatan Pandya

document.addEventListener('DOMContentLoaded', function() {
    const MIN_DEGREE_INCREMENT = 5;
    const MAX_DEGREE_INCREMENT = 10;
    const NUM_CYCLE_INCREMENT = 50;
    const PAUSE_INTERVAL_INCREMENT = 50;
    const BREAK_CYCLE_INCREMENT = 2;

    const min_degrees = document.getElementById('min-degree-select');
    const max_degrees = document.getElementById('max-degree-select');
    const numCycles = document.getElementById('numCycle-select');
    const pauseInterval = document.getElementById('pauseInterval-select');
    const breakCycle = document.getElementById('breakCycle-select');

    function initializeSelectOptions(selectElement, start, end, increment, label) {
        for (let i = start; i <= end; i += increment) {
            const option = document.createElement('option');
            option.value = i;
            if (i === 0 && selectElement === pauseInterval) {
                option.textContent = "No Pause";
            } else {
                option.textContent = `${i} ${label}`;
            }
            selectElement.appendChild(option);
        }
    }
    

    initializeSelectOptions(min_degrees, 0, 50, MIN_DEGREE_INCREMENT, 'Degrees');
    initializeSelectOptions(max_degrees, 10, 100, MAX_DEGREE_INCREMENT, 'Degrees');
    initializeSelectOptions(numCycles, 0, 2000, NUM_CYCLE_INCREMENT, 'Cycles');
    initializeSelectOptions(pauseInterval, 0, 1000, PAUSE_INTERVAL_INCREMENT, 'Cycles');
    initializeSelectOptions(breakCycle, 0, 30, BREAK_CYCLE_INCREMENT, 'Seconds');


    let b_flag = false;

    function run_button() {

        const minDegreeSelect = document.getElementById('min-degree-select').value;
        const maxDegreeSelect = document.getElementById('max-degree-select').value;
        const numCycleSelect = document.getElementById('numCycle-select').value;
        const pauseIntervalSelect = document.getElementById('pauseInterval-select').value;
        const breakCycleSelect = document.getElementById('breakCycle-select').value;

        if (!minDegreeSelect || !maxDegreeSelect || !numCycleSelect || !pauseIntervalSelect || !breakCycleSelect) {
            alert('Please fill in all entries before running.');
            location.reload();
            return false;
        }

        if (maxDegreeSelect - minDegreeSelect > 50) {
            alert("Angular Range too large. Cannot be greater than " + (maxDegreeSelect - minDegreeSelect) + "\u00B0");
            location.reload();
            return false;
        } else {
            b_flag = true;
        }


        const data = {
            minDegreeSelect,
            maxDegreeSelect,
            numCycleSelect,
            pauseIntervalSelect,
            breakCycleSelect
        };

        
        fetch('/run', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            })
            .then(response => {
                if (response.ok) {
                    console.log("Fetch request successful, emitting...");
                } else {
                    console.log("Fetch request failed.");
                }
            })
            .catch(error => {
                console.log("Error with fetch request: ", error);
            });
    }


    function updateCounterValue(value) {
        document.getElementById('currentCycleInfo').textContent = value;
    }

    function updateResumeStatus(value) {
        if (currentState === states.OFF) {
            updateButton();
        } else if (value === true) {
            currentState = states.PAUSED;
            button2State_pause = false;
            updateButton();
        } else if (value === false) {
            currentState = states.RUNNING;
            button2State_resume = false;
            updateButton();
        }
    }

    function updateRunStatus(value) {
        if (value === true) {
            currentState = states.OFF;
            updateCounterValue(0)
            updateButton();
            document.getElementById('refresh').click();
        }
    }


    function fetchCounter() {
        fetch('/fetch', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            })
            .then(handleResponse)
            .then(handleData)
            .catch(handleError);
    }

    function handleResponse(response) {
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
    }

    function handleData(data) {
        updateCounterValue(data.counter);
        updateResumeStatus(data.status);
        updateRunStatus(data.done);
    }

    function handleError(error) {
        console.error(error);
    }



    const button1 = document.getElementById('button1');
    const button2 = document.getElementById('button2');


    const states = {
        OFF: 0,
        RUNNING: 1,
        PAUSED: 2,
    };

    let currentState = states.OFF;

    function updateButton() {
        switch (currentState) {
            case states.OFF:
                button1.innerText = 'Run';
                button1.className = 'run';
                button2.innerText = 'Pause';
                button2.className = 'pause';
                break;
            case states.RUNNING:
                button1.innerText = 'Stop';
                button1.className = 'stop';
                button2.innerText = 'Pause';
                button2.className = 'pause';
                break;
            case states.PAUSED:
                button1.innerText = 'Stop';
                button1.className = 'stop';
                button2.innerText = 'Resume';
                button2.className = 'resume';
                break;
        }
    }


    let button1State_stop = false;
    let button1State_run = false;

    let button2State_pause = false;
    let button2State_resume = false;



    button1.addEventListener('click', () => {
        if (currentState === states.OFF) {
            currentState = states.RUNNING;
            button1State_run = true;
            button1State_stop = false;
            if (run_button()) {
                updateButton();
            }
    
        } else if (currentState === states.RUNNING || currentState === states.PAUSED) {
            currentState = states.OFF;
            button1State_run = false;
            button1State_stop = true;
            updateButton();
        }
        if (b_flag === true){
            updateButton();
        }
    });
    

    button2.addEventListener('click', () => {
        if (currentState === states.RUNNING) {
            button2State_pause = true;
            button2State_resume = false;

        } else if (currentState === states.PAUSED) {
            button2State_pause = false;
            button2State_resume = true;
        }
        updateButton();
    });

    updateButton();

    function sendButtonStatesToFlask() {
        const interval = 100;
        setInterval(() => {

            fetchCounter();

            const buttonStates = {
                button1State_stop,
                button2State_pause,
                button2State_resume,
                button1State_run
            };

            const jsonData = JSON.stringify(buttonStates);

            fetch('/get', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: jsonData,
                })
                .then((response) => {
                    if (!response.ok) {
                        throw new Error('Network response was not ok');
                    }
                    return response.json();
                })
                .then((data) => {
                    console.log('Button states sent to Flask:', data);
                })
                .catch((error) => {
                    console.error('Error sending button states to Flask:', error);
                });
        }, interval);
    }

    sendButtonStatesToFlask();

    document.getElementById('shutdown').addEventListener('click', function(event) {
        event.preventDefault();
        if (confirm('Are you sure you want to shutdown?')) {
            window.location.href = '/shutdown';
        }
    });
});