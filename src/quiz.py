from collections import defaultdict
import json

from cards import compare_answer, create_base_cards, get_unique_cards, print_cards
from helpers import FrozenCollectionEncoder
from schema import print_classes
from schema_loader import create_classes, create_definitions_from_schema, freeze_definitions, open_schema_file


def run_quiz(cards):
    print('AFTER DIVISION')
    for card in cards:
        print()
        print('from')
        print(card['from'])
        print()
        print('to')
        keys = list(list(card['to'])[0].keys())
        remaining_answers = set(card['to'])
        for i in range(len(remaining_answers)):
            response = {}
            for key in keys:
                field_response = input('{}: '.format(key)).strip()
                first_char = len(field_response) > 0 and field_response[0]
                is_json = first_char in ('[', '{')
                response[key] = json.loads(field_response) if is_json else field_response

            for answer in remaining_answers:
                comparison = compare_answer(answer, response)
                print('comparison', comparison)
                if comparison:
                    remaining_answers.remove(answer)
                    break

        for value in card['to']:
            print(value)
            print(list(value.keys()))
            print('------------')
            print()
        print('==================')


global_schema = open_schema_file('data/schema.yaml')
global_classes = {}
global_definitions = defaultdict(lambda: {})

create_classes(global_classes, global_schema)
print_classes(global_classes)

create_definitions_from_schema(global_classes, global_definitions, global_schema)
freeze_definitions(global_definitions)

global_base_cards = create_base_cards(global_classes, global_definitions)
print('BASE CARDS')
print_cards(global_base_cards)

global_cards = get_unique_cards(global_base_cards)

print('AFTER UNIQUE')
print_cards(global_cards)
run_quiz(global_cards)
