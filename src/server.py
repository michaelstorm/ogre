from collections import defaultdict
from flask import Flask, Blueprint, render_template
from flask_restful import Resource, Api

from cards import compare_answer, create_base_cards, get_unique_cards, print_cards
from schema import FrozenCollectionEncoder, print_classes
from schema_loader import create_classes, create_definitions_from_schema, freeze_definitions, open_schema_file


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
print('CARDS')
print_cards(global_cards)


class MyConfig(object):
    RESTFUL_JSON = {'cls': FrozenCollectionEncoder}

app = Flask(__name__, static_folder='../dist')
app.config.from_object(MyConfig)

api_bp = Blueprint('api', __name__, url_prefix='/api')
api = Api(api_bp)


def get_field_value_type(class_spec):
    j = {}
    for key, value in class_spec.__dict__.items():
        if key == 'fields':
            j['fields'] = {field.name: get_field_types(field) for field in value.values()}
        else:
            j[key] = value

    return j


def get_field_types(field):
    j = {}
    for key, value in field.__dict__.items():
        if key == 'class_spec':
            j['class_name'] = value.name
        elif key == 'value_type':
            print(field, value)
            j['value_type'] = get_field_value_type(value) if value else None
        else:
            j[key] = value

    return j


class HelloWorld(Resource):
    def get(self):
        cards = []
        for card in global_cards:
            card['to_fields'] = {field_name: get_field_types(field) for field_name, field in list(card['to'])[0].items()}
            cards.append(card)

        return cards


api.add_resource(HelloWorld, '/cards')
app.register_blueprint(api_bp)


@app.route('/')
def hello_world():
    return render_template('index.html')


if __name__ == '__main__':
    app.run(debug=True)
