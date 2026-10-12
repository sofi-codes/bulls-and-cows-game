import random

first_digit = random.sample("123456789", 1)
remaining_pool = "0123456789".replace(first_digit[0], "")
remaining_digits = random.sample(remaining_pool, 3)
answer = "".join(first_digit + remaining_digits)


def main():

    num_of_guesses = 0
    running = True

    while running:

        correct_digits = 0
        right_place = 0

        # INPUT VALIDATION
        Valid = False
        while not Valid:
            repeated = False
            guess = input("Enter your guess: ")
            for digit in guess:
                if guess.count(digit) > 1:
                    repeated = True
                    break
            if guess == "":
                print("Please enter your guess")
                print()
            elif not guess.isdigit():
                print("Enter only digits")
                print()
            elif len(guess) != 4:
                print("The number is of 4 digits")
                print()
            elif repeated:
                print("No repeated digits allowed")
                print()
            else:
                num_of_guesses += 1
                Valid = True

        # COUNTING BULLS
        for i in range(4):
            if answer[i] == guess[i]:
                right_place += 1

        # COUNTING COWS
        for i in range(4):
            for j in range(4):
                if answer[i] == guess[j]:
                    correct_digits += 1
                    break

        cows = correct_digits - right_place
        print(f"COWS : {cows}")
        print(f"BULLS : {right_place}")
        print("------------------------")
        print()

        if guess == answer:
            print("**********************")
            print("-------YOU WON!-------")
            print("**********************")
            print(f"The answer was {answer}")
            print()
            print(f"You took {num_of_guesses} guesses")
            running = False


if __name__ == "__main__":
    main()
