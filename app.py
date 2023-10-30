# """
# author : jatan pandya
# """

from gpiozero import AngularServo
from gpiozero.pins.pigpio import PiGPIOFactory
from time import sleep
from flask import Flask, render_template, request, jsonify
import os

FACTORY = PiGPIOFactory()
PIN = 12

counter = 0
done = None
status = False
first_time = True

# FLASK FUNCTIONS
app = Flask(__name__)


@app.route("/shutdown")
def shutdown():
    os.system('sudo shutdown now')
    return "Done"


@app.route("/")
def index():
    global counter
    global done
    global status
    global first_time

    counter = 0
    done = False
    status = None
    first_time = True

    return render_template("index.htm")


@app.route("/help")
def doc():
    return render_template("doc.html")


@app.route("/")
def refresh():
    global counter
    global done
    global status
    global first_time

    if not first_time:
        servo = AngularServo(
            PIN,
            pin_factory=FACTORY,
            min_pulse_width=0.0005,
            max_pulse_width=0.0025,
            frame_width=0.05,
            initial_angle=0.0,
            min_angle=-50,
            max_angle=100)
        servo.close()
    else:
        pass

    counter = 0
    done = False
    status = None
    first_time = True

    return render_template("index.htm")


@app.route("/run", methods=["POST", "GET"])
def submit():
    global first_time
    if first_time:
        servo = AngularServo(
            PIN,
            pin_factory=FACTORY,
            min_pulse_width=0.0005,
            max_pulse_width=0.0025,
            frame_width=0.05,
            initial_angle=0.0,
            min_angle=-50,
            max_angle=100
        )
    else:
        servo = AngularServo(
            PIN,
            pin_factory=FACTORY,
            min_pulse_width=0.0005,
            max_pulse_width=0.0025,
            frame_width=0.05,
            initial_angle=0.0,
            min_angle=-50,
            max_angle=100
        )
        servo.close()

    try:
        global counter
        global done
        global status

        def wait():
            global status
            isResumed = app.config["button2State_resume"]
            isStopped = app.config["button1State_stop"]
            status = True
            if isStopped:
                return True
            if isResumed is True:
                return True
            if isResumed is False:
                return False

        if request.method == "POST":
            jsonData = request.get_json()
            keys = [
                "minDegreeSelect",
                "maxDegreeSelect",
                "numCycleSelect",
                "pauseIntervalSelect",
                "breakCycleSelect",
            ]
            data_dict = {key: int(jsonData[key]) for key in keys}

            min_degree = -1 * data_dict["minDegreeSelect"]
            max_degree = data_dict["maxDegreeSelect"]
            num_cycles = data_dict["numCycleSelect"]
            pause_cycle = data_dict["pauseIntervalSelect"]
            break_cycle = data_dict["breakCycleSelect"]

            slow_time = 30
            step = 2

            servo.mid()
            mid_angle = int(servo.angle)  # type: ignore

            sleep(0.5)
            curr_angle = int(servo.angle)  # type: ignore
            for angle in range(int(curr_angle), int(min_degree), -1):
                servo.angle = angle  # type: ignore
                sleep(35 / 1000)
            sleep(0.5)

            for curr_cycle in range(num_cycles):
                isStopped = app.config["button1State_stop"]
                isPaused = app.config["button2State_pause"]
                if not isPaused:
                    if not isStopped:
                        isStopped = app.config["button1State_stop"]
                        isPaused = app.config["button2State_pause"]
                        for angle in range(
                                int(min_degree), int(max_degree), step):
                            servo.angle = angle  # type: ignore
                            sleep(slow_time / 1000)  # type: ignore

                        for angle in range(
                                int(max_degree), int(min_degree), -step):
                            servo.angle = angle  # type: ignore
                            sleep(slow_time / 1000)  # type: ignore

                        counter += 1
                        sleep(break_cycle)
                        status = False

                        if not isStopped:
                            if not pause_cycle == 0:    
                                if counter % pause_cycle == 0:
                                    while not wait():
                                        continue
                                    else:
                                        status = False
                    if isStopped:
                        sleep(1)
                        curr_angle = int(servo.angle)  # type: ignore
                        for angle in range(int(curr_angle), mid_angle):
                            servo.angle = angle  # type: ignore
                            sleep(50 / 1000)
                        sleep(1)
                        first_time = False
                        counter = 0
                        servo.close()  # type: ignore
                        done = True

                else:
                    if not isStopped:
                        status = False
                        while not wait():
                            continue
                        else:
                            status = False

            sleep(1)
            curr_angle = int(servo.angle)  # type: ignore
            for angle in range(int(curr_angle), mid_angle):
                servo.angle = angle  # type: ignore
                sleep(50 / 1000)
            sleep(1)
            first_time = False
            counter = 0
            servo.close()  # type: ignore
            done = True
            return "Done"

    except Exception as e:
        return jsonify({"error": "Internal Server Error"}), 500
    return "Done"


@app.route("/fetch", methods=["POST", "GET"])
def send_data():
    global counter
    global done
    global status
    response_data = {"counter": counter, "done": done, "status": status}
    return jsonify(response_data)


@app.route("/get", methods=["POST", "GET"])
def receive_button_states():
    try:
        button_states = request.get_json()
        if button_states:
            for key, value in button_states.items():
                app.config[key] = value
        elif button_states is None:
            return jsonify({"error": "No JSON data received"}), 400
        else:
            return jsonify({"error": "Invalid JSON data"}), 400
        response = {"message": "Button states received successfully"}
        return jsonify(response), 200

    except Exception as e:
        error_message = f"Error receiving button states: {str(e)}"
        return jsonify({"error": error_message}), 400


if __name__ == "__main__":
    app.run(host='0.0.0.0',port=8000)
