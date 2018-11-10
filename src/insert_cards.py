from sqlalchemy.sql.expression import ClauseElement
from greek import generate_declensions, load_data, data as yaml_data, remove_parens
import itertools
import re


def get_or_create(model, defaults=None, **kwargs):
    instance = session.query(model).filter_by(**kwargs).first()
    if instance:
        return instance
    else:
        params = dict((k, v) for k, v in kwargs.items() if not isinstance(v, ClauseElement))
        params.update(defaults or {})
        instance = model(**params)
        session.add(instance)
        return instance


def split_meanings(meanings_str):
    meanings = []
    for section in meanings_str.split(';'):
        match = re.match(r'(\(.+?\))?.*?(\(.+?\))?$', section.strip())
        before_note = match.group(1) if match.group(1) else ''
        after_note = match.group(2) if match.group(2) else ''
        meanings += [' '.join([before_note, m.strip(), after_note]).strip() for m in remove_parens(section).split(',')]

    return meanings


def insert_cards(declined_nouns, prepositions, other_words):
    paradigm_names = set([noun_data['paradigm'] for noun_data in declined_nouns.values()])

    for nominative, noun_data in declined_nouns.items():
        noun = get_or_create(Noun, nominative=nominative, genitive=noun_data['genitive'],
                             paradigm=noun_data['paradigm'], gender=noun_data['gender'],
                             cognates=noun_data['cognates'])

        meanings = [get_or_create(NounMeaning, noun=noun, english=remove_parens(meaning), full_english=meaning)
                    for meaning in split_meanings(noun_data['meanings'])]

        get_or_create(Card, noun=noun, card_type='noun', direction=0)
        for meaning in meanings:
            get_or_create(Card, noun_meaning=meaning, card_type='noun', direction=1)

    for form in [''.join(c) for c in itertools.product('NGDAV', 'SDP')]:
        for paradigm_name in paradigm_names:
            declension = get_or_create(Declension, paradigm=paradigm_name, noun_case=form[0], number=form[1])

            for direction in (0, 1):
                get_or_create(Card, declension=declension, card_type='declension', direction=direction)

    for full_greek, preposition_data in prepositions.items():
        greek = remove_parens(full_greek).strip()
        meanings = []
        for noun_case, noun_case_meanings in preposition_data['meanings'].items():
            preposition = get_or_create(Preposition, greek=greek, full_greek=full_greek, noun_case=noun_case,
                                        cognates=preposition_data['cognates'])

            for full_english in split_meanings(noun_case_meanings):
                meanings.append(get_or_create(PrepositionMeaning, preposition=preposition, english=remove_parens(full_english),
                                              full_english=full_english))

            get_or_create(Card, preposition=preposition, card_type='preposition', direction=0)
            for meaning in meanings:
                get_or_create(Card, preposition_meaning=meaning, card_type='preposition', direction=1)

    for full_greek, word_data in other_words.items():
        greek = remove_parens(full_greek).strip()
        word = get_or_create(Word, greek=greek, full_greek=full_greek, cognates=word_data.get('cognates'))

        meanings = [get_or_create(WordMeaning, word=word, english=remove_parens(meaning), full_english=meaning)
                    for meaning in split_meanings(word_data['meanings'])]

        get_or_create(Card, word=word, card_type='word', direction=0)
        for meaning in meanings:
            get_or_create(Card, word_meaning=meaning, card_type='word', direction=1)

    session.commit()


# print(yaml_data.keys())
declined_nouns = generate_declensions(yaml_data['nouns'])
# print(declined_nouns)
insert_cards(declined_nouns, yaml_data['prepositions'], yaml_data['other'])
