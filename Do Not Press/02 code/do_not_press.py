
from machine import Pin
import rp2
import time

# Load your PIO program
 
@rp2.asm_pio()
def button_debounce():
    # Initialize y register to 0
    set(y, 0)
    
    wrap_target()
    label('isone')
    wait(0, pin, 0)      # the pin is 1, wait for it to become 0
    set(x, 31)          # prepare to test the pin for 31 times
    
    label('checkone')
    jmp(pin, 'isone')     # if the pin has returned to 1, start over
    jmp(x_dec, 'checkone')  # decrease the time to wait
    jmp('iszero')        # the pin has definitively become 0
     
    label('iszero')
    wait(1, pin, 0)      # the pin is 0, wait for it to become 1
    set(x, 31)          # prepare to test the pin for 31 times
    
    label('checkzero')
    jmp(pin, 'stillone')  # check if the pin is still 1

    label('stillone')
    jmp(x_dec, 'checkzero') # decrease the time to wait, or the pin has definitively become 1
    
    irq(rel(0))  # Trigger an interrupt when debounce is complete           
 
    # Push current value to ISR
    mov(isr, y)
    push(noblock)
    
    wrap()
    
    
light_pin = Pin(3,Pin.OUT)
light_pin.low()

motor_pin = Pin(4,Pin.OUT)
motor_pin.low()

impulse_time=0.1
motor_delay=0.5
motor_time=2


# Define the interrupt handler
def button_pressed_handler(sm):
    #ignore any further button presses until cycle is finished by turning off statemachine
    sm.active(0)
    
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
    
    # Start the state machine again
    sm.active(1)
   
# Set up the state machine
button_pin = Pin(7, Pin.IN, Pin.PULL_UP)


sm = rp2.StateMachine(0, button_debounce, in_base=button_pin)


# Set the IRQ handler
sm.irq(handler=button_pressed_handler)

# Start the state machine
sm.active(1)

# Keep the program running
try:
    while True:
      pass 
except KeyboardInterrupt:
    sm.active(0)
    
    
'''   
MIT License

Copyright (c) 2025 Swiss Science Center Technorama

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

'''