from sqlalchemy import Column, DateTime, ForeignKey, String, Integer, Text, func, create_engine, text
from sqlalchemy.dialects import postgresql
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship, scoped_session
import uuid


engine = create_engine('postgresql://postgres:postgres@localhost/ogre', echo=False)
session = scoped_session(sessionmaker(autocommit=False, autoflush=False, bind=engine))
Base = declarative_base()
Base.query = session.query_property()

UUIDPrimaryKey = lambda: Column(postgresql.UUID, primary_key=True, server_default=text("uuid_generate_v4()"))


class TimestampMixin:
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class Review(Base, TimestampMixin):
    __tablename__ = 'reviews'
    id = UUIDPrimaryKey()

    field_reviews = relationship("FieldReview", backref="review", lazy="dynamic")


class FieldReview(Base, TimestampMixin):
    __tablename__ = 'field_reviews'
    id = UUIDPrimaryKey()

    review_id = Column(postgresql.UUID, ForeignKey('reviews.id'), nullable=False)

    class_name = Column(String(256), nullable=False)
    field_name = Column(String(256), nullable=False)
    recall = Column(Integer, nullable=False)

    def __repr__(self):
        return '<FieldReview {}:{} = {} @ {} ({})>'.format(
            self.class_name, self.field_name, self.recall_difficulty, self.created_at, self.id)
