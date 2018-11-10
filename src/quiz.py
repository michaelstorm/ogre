from datetime import datetime, timedelta
from greek import conjugate, noun_data, noun_forms
from greek_spaced_repetition.models import Noun, NounMeaning, Preposition, PrepositionMeaning, WordMeaning, Declension, Card, CardReview, session
from sqlalchemy import func
import humanize
import itertools
import random
import re
import sqlite3
import uuid


def filter_card(max_new_cards):
    new_cards_count = 0

    def should_allow(card, now):
        if card.last_correctly_answered == None:
            if card.first_reviewed != None:
                return True, False
            else:
                return new_cards_count - 1 < max_new_cards, True
        else:
            return now >= card.last_correctly_answered + REPETITION_INTERVALS[card.leitner_box], False

    def _(cards):
        nonlocal new_cards_count
        first, second = cards
        now = datetime.now()

        allow_any = False
        for card in cards:
            if card is not None:
                allow, is_new = should_allow(card, now)
                if allow:
                    allow_any = True
                if is_new:
                    new_cards_count += 1

        return allow_any

    return _


def get_new_cards_count(table):
    new_cards_count = list(c.execute("SELECT COUNT(*) FROM {} WHERE first_reviewed IS NULL".format(table)))[0][0]
    new_cards_reviewed_today_count = list(c.execute("SELECT COUNT(*) FROM {} WHERE first_reviewed >= date('now', 'start of day', 'localtime') AND first_reviewed < date('now', '1 day', 'localtime')".format(table)))[0][0]
    new_cards_remaining_today_count = max(0, min(new_cards_count, DAILY_NEW_CARD_LIMIT - new_cards_reviewed_today_count))
    return new_cards_count, new_cards_remaining_today_count


def get_cards():
    # new_cards_count, new_cards_remaining_today_count = 0, 0
    # for table in ['noun_cards', 'declension_cards']:
    #     table_new_cards_count, table_new_cards_remaining_today_count = get_new_cards_count(table)
    #     new_cards_count += table_new_cards_count
    #     new_cards_remaining_today_count += table_new_cards_remaining_today_count

    # print('Remaining new cards today: {} of {}'.format(new_cards_remaining_today_count, new_cards_count))

    # new_wrong_cards_count = list(c.execute("SELECT COUNT(*) FROM noun_cards WHERE first_reviewed IS NOT NULL AND last_correctly_answered IS NULL"))[0][0]
    # if new_wrong_cards_count > 0:
    #     print('New cards not yet correctly answered: {}'.format(new_wrong_cards_count))

    # print('Existing cards to review:')

    # now = datetime.now()
    # for leitner_box, interval in enumerate(REPETITION_INTERVALS):
    #     query = "SELECT COUNT(*) FROM noun_cards WHERE leitner_box == ? AND ? >= DATETIME(last_correctly_answered, '+{} seconds')".format(interval.total_seconds())

    #     interval_cards_count = list(c.execute(query, (leitner_box, now)))[0][0]
    #     if interval_cards_count > 0:
    #         print('{}: {}'.format(humanize.naturaldelta(interval), interval_cards_count))

    # print()

    # cards_by_direction = defaultdict(list)
    # for direction in (0, 1):
    #     noun_cards = session.query(Card).filter_by(card_type=card_type, direction=direction)
    #     declension_cards = session.query(Card).filter_by(card_type='declension', direction=direction)
    #     cards.extend(itertools.zip_longest(noun_cards, declension_cards))

    def card_tuple_sort(c):
        if c[0] and c[1]:
            last_reviewed = min(c[0].last_reviewed, c[1].last_reviewed) if c[0].last_reviewed and c[1].last_reviewed else None
            return c[0].last_reviewed is None or c[1].last_reviewed is None, last_reviewed
        else:
            card = c[0] if c[0] else c[1]
            return card.last_reviewed is None, card.last_reviewed

    cards = session.query(Card).all()
    cards = sorted(cards, key=card_tuple_sort)
    # cards = list(filter(filter_card(new_cards_remaining_today_count), cards))
    return cards


def get_random_row(table):
    return list(c.execute('SELECT id FROM {} ORDER BY RANDOM() LIMIT 1'.format(table)))[0][0]


def save_card_review(card, score):
    timestamp = datetime.now()
    new_leitner_box = 0 if card.leitner_box is None else max(0, min(card.leitner_box + score, len(REPETITION_INTERVALS) - 1))

    card.leitner_box = new_leitner_box
    card.last_reviewed = timestamp
    if card.first_reviewed == None:
        card.first_reviewed = timestamp

    if score == 1:
        card.last_correctly_answered = timestamp

    review = CardReview(card=card, time=timestamp, direction=card.direction, score=score)
    session.add(review)


def get_noun_card_group(card, cards):
    noun_card = card
    declension_card = cards.filter_by(card_type='declension', direction=card.direction).first()
    return noun_card, declension_card


def get_declension_card_group(card, cards):
    declension_card = card
    noun_card = cards.filter_by(card_type='noun', direction=card.direction).first()
    return noun_card, declension_card


DAILY_NEW_CARD_LIMIT = 4
REPETITION_INTERVALS = [timedelta(minutes=1), timedelta(days=1), timedelta(days=2), timedelta(days=5), timedelta(weeks=2),
                        timedelta(weeks=4), timedelta(weeks=8), timedelta(weeks=24), timedelta(weeks=52), timedelta(weeks=104)]

correct_count = 0
incorrect_count = 0
skipped_count = 0

try:
    old_cards = session.query(Card).filter(Card.first_reviewed != None).all()
    new_cards = session.query(Card).filter(Card.first_reviewed == None).all() #.limit(DAILY_NEW_CARD_LIMIT).all()

    random.shuffle(old_cards)
    random.shuffle(new_cards)

    cards = old_cards + new_cards

    for card in cards: #.filter_by(card_type='word'):
        # if card.card_type != 'preposition':
        #     continue
        direction = card.direction

        if card.card_type in ['noun', 'declension']:
            if card.card_type == 'noun':
                noun_card = card
                declension_card = next((c for c in cards if c.card_type == 'declension' and c.direction == direction), None)
            elif card.card_type == 'declension':
                declension_card = card
                noun_card = next((c for c in cards if c.card_type == 'noun' and c.direction == direction), None)

            if noun_card:
                noun = noun_card.noun if direction == 0 else noun_card.noun_meaning.noun
            else:
                noun = session.query(Noun).order_by(func.random()).first()

            declension = declension_card.declension if declension_card else session.query(Declension).order_by(func.random()).first()

            form = '{}{}'.format(declension.noun_case, declension.number)
            form_with_gender = '{}{}'.format(form, noun.gender)

            conjugated = conjugate(noun.nominative, declension.paradigm, form_with_gender, noun_data['paradigms'])

            if direction == 0:
                meanings = [m.english for m in session.query(NounMeaning).filter_by(noun=noun)]
                possible_forms = set()
                for possible_form in noun_forms(noun.gender):
                    possible_form_conjugation = conjugate(noun.nominative, declension.paradigm, possible_form, noun_data['paradigms'])
                    if possible_form_conjugation == conjugated:
                        possible_forms.add(possible_form[:2])

                header = conjugated
                questions = [
                    {
                        'card': noun_card,
                        'questions': [('Meaning', meanings), ('Gender', [noun.gender])]
                    },
                    {
                        'card': declension_card,
                        'questions': [('Form', possible_forms)]
                    }
                ]
            else:
                header = '{}, {}'.format(noun_card.noun_meaning.full_english, form)
                questions = [
                    {
                        'card': noun_card,
                        'questions': [('Greek', [conjugated]), ('Gender', [noun.gender])]
                    }
                ]

        elif card.card_type == 'preposition':
            if direction == 0:
                preposition = card.preposition
                header = '{} + {}'.format(preposition.greek, preposition.noun_case)
                meanings = [m.full_english for m in session.query(PrepositionMeaning).filter_by(preposition=preposition)]
                questions = [
                    {
                        'card': card,
                        'questions': [('Meaning', meanings)]
                    }
                ]
            else:
                meaning = card.preposition_meaning
                preposition = meaning.preposition
                header = meaning.full_english
                questions = [
                    {
                        'card': card,
                        'questions': [('Greek', [preposition.greek]), ('Case', [preposition.noun_case])]
                    }
                ]

        elif card.card_type == 'word':
            if direction == 0:
                word = card.word
                header = word.full_greek
                meanings = [m.english for m in session.query(WordMeaning).filter_by(word=word)]
                questions = [
                    {
                        'card': card,
                        'questions': [('Meaning', meanings)]
                    }
                ]
            else:
                meaning = card.word_meaning
                header = meaning.full_english
                questions = [
                    {
                        'card': card,
                        'questions': [('Greek', [meaning.word.greek])]
                    }
                ]

        def ask_question(question_data):
            scores = []
            for question in question_data['questions']:
                prompt, answers = question[:2]
                full_answer = question[2] if len(question) > 2 else ', '.join(answers)
                answers = set(answers)
                response = set([r.strip() for r in re.split(r',|;', input('{}: '.format(prompt)))])
                correct = True if response == set(answers) else False
                scores.append({
                    'prompt': prompt,
                    'answers': full_answer,
                    'correct': correct
                })
            return scores

        print('+' + '=' * (len(header) + 2) + '+')
        print('| {} |'.format(header))
        print('+' + '=' * (len(header) + 2) + '+')

        all_results = []
        for question_data in questions:
            results = ask_question(question_data)
            all_results.extend(results)

            card = question_data['card']
            if card:
                correct = all(r['correct'] for r in results)
                save_card_review(card, correct)

        for result in all_results:
            if result['correct']:
                print('{} correct!'.format(result['prompt']))
            else:
                print('{} incorrect! Answers were: {}'.format(result['prompt'], result['answers']))

        print()
        session.commit()

except (IOError, EOFError, KeyboardInterrupt):
    pass
finally:
    total_count = correct_count + incorrect_count + skipped_count
    print('\n{} cards tested; {} correct; {} incorrect; {} skipped'.format(total_count, correct_count, incorrect_count, skipped_count))
