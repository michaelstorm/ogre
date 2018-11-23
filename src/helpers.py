from frozendict import frozendict
import json

def is_iterable(object):
    return hasattr(object, '__iter__')


class FrozenCollectionEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, frozenset) or isinstance(obj, set):
            return [self.default(x) for x in obj]
        elif isinstance(obj, frozendict):
            return {x: self.default(y) for x, y in obj.items()}
        else:
            return obj
