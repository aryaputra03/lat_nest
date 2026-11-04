import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTaskIndexes1793763938356 implements MigrationInterface {
  name = 'AddTaskIndexes1793763938356';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX "IDX_db55af84c226af9dce09487b61" ON "tasks"  ("user_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c7af812c1f8f4035af0934e3d9" ON "tasks"  ("user_id", "status") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c7af812c1f8f4035af0934e3d9"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_db55af84c226af9dce09487b61"`,
    );
  }
}
