from helpers import is_iterable

import itertools
from frozendict import frozendict
from pprint import pprint


def resolve_value(resolve_field_name, definition, tab=0):
    print('\t' * tab, '|', resolve_field_name, definition)
    print()
    results = set()

    if resolve_field_name in definition.field_defs:
        child_field_defs = [definition.field_defs[resolve_field_name]]
    else:
        child_field_defs = definition.field_defs.values()

    for child_field_def in child_field_defs:
        child_field = child_field_def.field

        if child_field.name == resolve_field_name:
            results.add(child_field_def)
        elif child_field.value_type:
            if child_field.collection_type == 'scalar':
                child_result = resolve_value(resolve_field_name, child_field_def.value, tab + 1)
            else:
                for child_field_list_value in child_field_def.value:
                    print('\t' * tab, '*', child_field_list_value)
                    print()
                    child_result = resolve_value(resolve_field_name, child_field_list_value, tab + 1)
            results.update(child_result)

    print('\t' * tab, '> results', results)
    print()
    return frozenset(results)


def create_base_cards(classes, definitions):
    base_cards = []
    for class_name, class_data in classes.items():
        for quiz_set in class_data.quiz_sets:
            for definition_name, definition in definitions.get(class_name, {}).items():
                print('RESOLVING TO FIELDS')
                to_dict = {quiz_field_name: resolve_value(quiz_field_name, definition)
                           for quiz_field_name in quiz_set['to']}

                print()
                print('RESOLVING FROM FIELDS')
                from_dict = {quiz_field_name: resolve_value(quiz_field_name, definition)
                             for quiz_field_name in quiz_set['from']}

                from_keys = list(from_dict.keys()) # consistent ordering
                from_values = [list(from_dict[key]) for key in from_keys]

                product = list(itertools.product(*from_values))
                for combination in product:
                    card = {
                        'to': to_dict,
                        'from': dict(zip(from_keys, combination))
                    }

                    base_cards.append(card)

    return base_cards


def get_unique_cards(base_cards):
    cards = []
    unique_from_sets = set([frozendict(f['from']) for f in base_cards])

    for from_set in unique_from_sets:
        card = {'from': from_set}
        to_set = set()

        for base_card in base_cards:
            if from_set == base_card['from']:
                to_set.add(frozendict(base_card['to']))

        card['to'] = to_set
        cards.append(card)

    return cards


def print_cards(cards):
    for card in cards:
        pprint(card)
        print()


def compare_answer(answer, response):
    success = True
    result = {}
    for field_name in answer:
        try:
            field_answer = answer[field_name]
            if is_iterable(field_answer):
                field_result = all([list_value.compare(response[field_name]) for list_value in field_answer])
            else:
                field_result = field_answer.compare(response[field_name])
        except KeyError:
            field_result = False

        result[field_name] = field_result
        success = success and field_result

    return success, result
