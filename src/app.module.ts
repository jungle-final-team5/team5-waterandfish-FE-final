import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'dist'), // Vite 빌드 결과물 위치
      exclude: ['/api*'], // API 경로는 제외 (API가 /api로 시작한다면)
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {} 