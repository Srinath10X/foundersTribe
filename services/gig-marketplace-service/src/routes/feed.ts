import { Router } from "express";
import { validate } from "../middleware/validate.js";
import {
  createPostSchema,
  listFeedSchema,
  getPostSchema,
  deletePostSchema,
  likePostSchema,
  createCommentSchema,
  listCommentsSchema,
} from "../schemas/feedSchemas.js";
import * as feedService from "../services/feedService.js";

const router = Router();

// Create a post
router.post("/", validate(createPostSchema), async (req, res, next) => {
  try {
    const userMeta = {
      full_name: req.user.user_metadata?.full_name,
      avatar_url: req.user.user_metadata?.avatar_url,
    };
    const data = await feedService.createPost(req.db, req.user.id, req.body, userMeta);
    res.status(201).json({ data });
  } catch (err) {
    next(err);
  }
});

// List feed
router.get("/", validate(listFeedSchema), async (req, res, next) => {
  try {
    const data = await feedService.listFeed(req.db, req.query, req.user.id);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// Get single post
router.get("/:id", validate(getPostSchema), async (req, res, next) => {
  try {
    const data = await feedService.getPostById(req.db, req.params.id as string, req.user.id);
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

// Delete post
router.delete("/:id", validate(deletePostSchema), async (req, res, next) => {
  try {
    await feedService.deletePost(req.db, req.params.id as string, req.user.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// Like a post
router.post("/:id/like", validate(likePostSchema), async (req, res, next) => {
  try {
    const data = await feedService.likePost(req.db, req.params.id as string, req.user.id);
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

// Unlike a post
router.delete("/:id/like", validate(likePostSchema), async (req, res, next) => {
  try {
    const data = await feedService.unlikePost(req.db, req.params.id as string, req.user.id);
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

// Add a comment
router.post("/:id/comments", validate(createCommentSchema), async (req, res, next) => {
  try {
    const data = await feedService.createComment(req.db, req.params.id as string, req.user.id, req.body);
    res.status(201).json({ data });
  } catch (err) {
    next(err);
  }
});

// List comments
router.get("/:id/comments", validate(listCommentsSchema), async (req, res, next) => {
  try {
    const data = await feedService.listComments(req.db, req.params.id as string, req.query);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

export default router;
