import machine
from machine import Pin
import time
import utime


light_pin = Pin(3,Pin.OUT)
light_pin.low()

motor_pin = Pin(4,Pin.OUT)
motor_pin.low()

impulse_time=0.1
motor_delay=0.5
motor_time=2
last=time.ticks_ms()
button = Pin(7, Pin.IN, Pin.PULL_UP)


last_state = button.value()

while True:
    current_state = button.value()
    if current_state != last_state:
        time.sleep(0.05)  # Small delay to avoid bounce
        current_state = button.value()  # Read state again
        if current_state == 0:  # Button pressed (LOW due to pull-up)
            print("Button pressed")
            
            #turn light on 
            light_pin.high()
            time.sleep(impulse_time) 
            light_pin.low()
            
            #motor delay
            time.sleep(motor_delay) 
            
            #turn motor on
            motor_pin.high()
            time.sleep(impulse_time) 
            motor_pin.low()
            
            #motor running time
            time.sleep(motor_time) 
            
            #trun motor off
            motor_pin.high()
            time.sleep(impulse_time) 
            motor_pin.low()
            
            #light delay
            time.sleep(motor_delay) 
            
            
            #turn light off
            light_pin.high()
            time.sleep(impulse_time) 
            light_pin.low()
        last_state = current_state
    time.sleep(0.01)  # Small pause to avoid repeated readings