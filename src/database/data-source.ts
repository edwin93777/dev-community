import 'dotenv/config';
import { DataSource } from 'typeorm';
import { configuration } from '../config/configuration.js';
import { validateEnvironment } from '../config/validate-env.js';
import { Comment } from '../modules/comments/entities/comment.entity.js';
import { Post } from '../modules/posts/entities/post.entity.js';
import { Reaction } from '../modules/reactions/entities/reaction.entity.js';
import { Role } from '../modules/roles/entities/role.entity.js';
import { User } from '../modules/users/entities/user.entity.js';

validateEnvironment(process.env);
const { database } = configuration();

export const dataSource = new DataSource({
  ...database,
  entities: [Role, User, Post, Comment, Reaction],
});
