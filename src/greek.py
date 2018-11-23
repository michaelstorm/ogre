from greek_accentuation.accentuation import add_accent, get_accent_type, possible_accentuations, ACUTE, CIRCUMFLEX
from greek_accentuation.characters import remove_diacritic
from greek_accentuation.syllabify import syllabify
import itertools
import re
import yaml

remove_accents = remove_diacritic(ACUTE, CIRCUMFLEX)


def remove_parens(string):
    return re.sub(r'\(.*?\)', '', string).strip()


def accentify(word, nominative, accent=None):
    syllables = syllabify(remove_accents(word))
    if not accent:
        accent = get_accent_type(nominative)
        accent_position, accent_type = accent

    # possible_accentuations() returns a generator, so prevent it from being
    # evaluated lazily by converting it to a list
    possible_accents = list(possible_accentuations(syllables))
    if accent in possible_accents:
        return add_accent(syllables, accent)
    else:
        new_accent = None
        if len(syllables) == 2 and accent_type == CIRCUMFLEX:
            new_accent = accent_position, ACUTE
        elif accent_type == ACUTE:
            new_accent = accent_position - 1, ACUTE

        if not new_accent or new_accent not in possible_accents:
            raise ValueError('Cannot apply accent to {}'.format(word))
        else:
            return add_accent(syllables, new_accent)


def conjugate(nominative, paradigm_name, form, endings):
    accent = None

    if paradigm_name == 'o-declension':
        stem = nominative[:-2]
        if form[0] in 'GD' and get_accent_type(nominative)[0] == 1:
            accent = 1, CIRCUMFLEX
    else:
        raise ValueError('Unknown paradigm {}'.format(paradigm_name))

    conjugated_form = accentify(stem + endings[paradigm_name][form], nominative, accent)
    return conjugated_form


def load_paradigm_data(paradigm, key_stack=None):
    if not key_stack:
        key_stack = []

    endings = {}

    def add_endings(new_endings):
        for new_key_stack, new_ending in new_endings.items():
            if new_key_stack in endings:
                raise Exception('Key stack {} has two different endings: {} and {}'.format(
                                new_key_stack, endings[new_key_stack], new_ending))
            else:
                endings[new_key_stack] = new_ending

    if type(paradigm) == str:
        add_endings({tuple(key_stack): paradigm})
    else:
        for key in paradigm.keys():
            key_stack.append(key)
            add_endings(load_paradigm_data(paradigm[key], key_stack))
            key_stack.pop()

    return endings


def load_paradigm(paradigm):
    paradigm_data = load_paradigm_data(paradigm)
    endings_by_case = {}

    all_cases = [''.join(c) for c in itertools.product('NGDAV', 'SDP', 'MFN')]
    for case_components in all_cases:
        case = ''.join(case_components)
        for key_stack in paradigm_data:
            if all([re.match(key, case) for key in key_stack]):
                if case in endings_by_case:
                    raise Exception('Case {} has two different endings; one is {}: {}'.format(
                                    case, key_stack, paradigm_data[key_stack]))
                endings_by_case[case] = paradigm_data[key_stack]

    return endings_by_case


def load_data(path):
    with open(path, 'r') as f:
        noun_endings_by_paradigm = {}

        yaml_data = yaml.load(f)
        nouns = yaml_data['nouns']

        paradigms = nouns['paradigms']
        for paradigm_name, paradigm in paradigms.items():
            noun_endings_by_paradigm[paradigm_name] = load_paradigm(paradigm)

        return {
            'nouns': {
                'paradigms': noun_endings_by_paradigm,
                'lexicon': nouns['lexicon']
            },
            'prepositions': yaml_data['prepositions'],
            'other': yaml_data['other']
        }


def noun_forms(gender_code):
    return [''.join(c) for c in itertools.product('NGDAV', 'SDP', gender_code)]


def generate_declensions(noun_data):
    declined_nouns = {}

    for paradigm_name, paradigm in noun_data['lexicon'].items():
        for gender, words in paradigm.items():
            if gender == 'masc':
                gender_code = 'M'
            elif gender == 'fem':
                gender_code = 'F'
            elif gender == 'neut':
                gender_code = 'N'
            else:
                raise ValueError('Unknown gender {} in paradigm {}'.format(gender, paradigm_name))

            for nominative, word_data in words.items():
                cognates = word_data.get('cognates')
                meanings = word_data['meanings']

                declined_nouns[nominative] = {
                    'paradigm': paradigm_name,
                    'nominative': nominative,
                    'genitive': word_data['genitive'],
                    'gender': gender_code,
                    'meanings': meanings,
                    'cognates': cognates,
                    'forms': {}
                }

                for form in noun_forms(gender_code):
                    declined = conjugate(nominative, paradigm_name, form, noun_data['paradigms'])
                    declined_nouns[nominative]['forms'][form] = declined

    return declined_nouns

data = load_data('data.yaml')
noun_data = data['nouns']
