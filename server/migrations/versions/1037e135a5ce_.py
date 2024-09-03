"""empty message

Revision ID: 1037e135a5ce
Revises: 902b27d709a9
Create Date: 2024-09-03 11:54:44.187649

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '1037e135a5ce'
down_revision = '902b27d709a9'
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    with op.batch_alter_table('assistants', schema=None) as batch_op:
        batch_op.alter_column('description',
               existing_type=sa.VARCHAR(length=200),
               type_=sa.String(length=300),
               existing_nullable=True)

    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    with op.batch_alter_table('assistants', schema=None) as batch_op:
        batch_op.alter_column('description',
               existing_type=sa.String(length=300),
               type_=sa.VARCHAR(length=200),
               existing_nullable=True)

    # ### end Alembic commands ###
