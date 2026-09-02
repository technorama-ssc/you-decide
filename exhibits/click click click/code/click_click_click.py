
from machine import Pin
from time import sleep_ms, ticks_ms, ticks_diff

# -------------------------------
# Class for controlling a 7-segment display via shift registers
# -------------------------------
class SegmentDisplay():
    def __init__(self, latch_pin=4, clock_pin=5, data_pin=6, is_red=True):
        # Initialize pins for latch, clock, and data
        self.latch = Pin(latch_pin, Pin.OUT)
        self.clock = Pin(clock_pin, Pin.OUT)
        self.data = Pin(data_pin, Pin.OUT)
        self.is_red = is_red  # Flag to identify display color (for debug print)

    def show(self, value):
        """Display a 3-digit number or string on the 7-segment display."""
        # Convert value to a 3-digit string if it's numeric
        if not isinstance(value, str):
            digit = f'{int(value):03}'
        else:
            digit = value

        # Send digits to shift register in reverse order
        for i in range(len(digit)):
            self._post(digit[len(digit)-1-i])

        # Latch the data to update the display
        self.latch.low()
        self.latch.high()

#         # Debug output to console
#         if self.is_red:
#             print("| ", digit, " |")
#         else:
#             print("                | ", digit, " |")

    def _post(self, digit):
        """Convert a single digit to segment bits and shift them out."""
        # Segment bit positions
        a = 1 << 0; b = 1 << 6; c = 1 << 5
        d = 1 << 4; e = 1 << 3; f = 1 << 1; g = 1 << 2

        # Map digit to segments
        if   digit == '1': segments =     b | c
        elif digit == '2': segments = a | b |     d | e |     g
        elif digit == '3': segments = a | b | c | d |         g
        elif digit == '4': segments =     b | c |         f | g
        elif digit == '5': segments = a |     c | d     | f | g
        elif digit == '6': segments = a |     c | d | e | f | g
        elif digit == '7': segments = a | b | c
        elif digit == '8': segments = a | b | c | d | e | f | g
        elif digit == '9': segments = a | b | c | d     | f | g
        elif digit == '0': segments = a | b | c | d | e | f
        elif digit == ' ': segments = 0
        elif digit == '-': segments = g
        elif digit == '/': segments = e | g | b
        elif digit == '\\': segments = f | g | c
        else: segments = 0  # Default: blank

        # Shift out 8 bits to the display
        for y in range(8):
            self.clock.low()
            self.data.value(segments & (1 << (7 - y)))
            self.clock.high()

# -------------------------------
# Configuration
# -------------------------------
MAX_COUNT   = 1_000        # Maximum allowed count before reset
TIMEOUT_MS  = 15_000    # Inactivity timeout (10 seconds)

# Button pin groups
red_pins   = [5, 6, 7]
green_pins = [16, 17, 18]

# Initialize displays
red_display   = SegmentDisplay(11, 12, 13, True)
green_display = SegmentDisplay(8, 9, 10, False)

# Initialize buttons with internal pull-up
red_buttons   = [Pin(pin, Pin.IN, Pin.PULL_UP) for pin in red_pins]
green_buttons = [Pin(pin, Pin.IN, Pin.PULL_UP) for pin in green_pins]

# Track button states and counters
red_states   = [False] * len(red_buttons)
green_states = [False] * len(green_buttons)
red_counter   = 0
green_counter = 0
red_changed   = False
green_changed = False

# Track last activity for inactivity timer
last_activity_ms = ticks_ms()

# Initial display update
red_display.show(red_counter)
green_display.show(green_counter)

# -------------------------------
# Main Loop
# -------------------------------
while True:
    # --- Check RED buttons ---
    for i, button in enumerate(red_buttons):
        val = button.value()
        if not val and not red_states[i]:  # Button pressed (falling edge)
            red_states[i] = True
            red_counter += 1
            red_changed = True
            last_activity_ms = ticks_ms()  # Reset inactivity timer
            #print(f"Red Button {i+1} pressed | Red Counter: {red_counter}")
        elif val and red_states[i]:        # Button released (rising edge)
            red_states[i] = False

    # --- Check GREEN buttons ---
    for i, button in enumerate(green_buttons):
        val = button.value()
        if not val and not green_states[i]:
            green_states[i] = True
            green_counter += 1
            green_changed = True
            last_activity_ms = ticks_ms()
            #print(f"Green Button {i+1} pressed | Green Counter: {green_counter}")
        elif val and green_states[i]:
            green_states[i] = False

    # --- Update RED display and check MAX_COUNT ---
    if red_changed:
        if red_counter > MAX_COUNT:
            #print(f"Red Counter exceeded {MAX_COUNT}. Resetting both counters.")
            # Flash animation for RED display
            green_display.show('   ')
            for _ in range(5):
                red_display.show('///'); sleep_ms(500)
                red_display.show('\\\\\\'); sleep_ms(500)
            # Reset both counters
            red_counter = 0
            green_counter = 0
            green_display.show(green_counter)
        red_display.show(red_counter)
        red_changed = False

    # --- Update GREEN display and check MAX_COUNT ---
    if green_changed:
        if green_counter > MAX_COUNT:
            #print(f"Green Counter exceeded {MAX_COUNT}. Resetting both counters.")
            # Flash animation for GREEN display
            red_display.show('   ')
            for _ in range(5):
                green_display.show('///'); sleep_ms(500)
                green_display.show('\\\\\\'); sleep_ms(500)
            # Reset both counters
            red_counter = 0
            green_counter = 0
            red_display.show(red_counter)
        green_display.show(green_counter)
        green_changed = False

    # --- Inactivity Timer: Reset counters if no activity for TIMEOUT_MS ---
    if ticks_diff(ticks_ms(), last_activity_ms) >= TIMEOUT_MS:
        if red_counter or green_counter:
            #print(f"No activity for {TIMEOUT_MS // 1000}s. Resetting counters.")
            red_counter = 0
            green_counter = 0
            red_display.show(red_counter)
            green_display.show(green_counter)
        last_activity_ms = ticks_ms()  # Reset timer after clearing

    # Small delay for loop pacing and basic debounce
    sleep_ms(8)
