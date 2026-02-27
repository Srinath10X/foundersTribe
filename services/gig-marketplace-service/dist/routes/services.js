import { Router } from "express";
import { validate } from "../middleware/validate.js";
import { createServiceRequestMessageSchema, createServiceRequestSchema, getServiceRequestSchema, getFreelancerServicesByUserSchema, listFreelancerServicesSchema, listMyServicesSchema, listServiceRequestMessagesSchema, listServiceRequestsSchema, markServiceRequestMessagesReadSchema, upsertMyServicesSchema, } from "../schemas/serviceSchemas.js";
import * as serviceCatalogService from "../services/serviceCatalogService.js";
const router = Router();
router.get("/", validate(listFreelancerServicesSchema), async (req, res, next) => {
    try {
        const data = await serviceCatalogService.searchFreelancerServices(req.db, req.query);
        res.json(data);
    }
    catch (err) {
        next(err);
    }
});
router.get("/me", validate(listMyServicesSchema), async (req, res, next) => {
    try {
        const data = await serviceCatalogService.listMyFreelancerServices(req.db, req.user.id);
        res.json({ items: data });
    }
    catch (err) {
        next(err);
    }
});
router.put("/me", validate(upsertMyServicesSchema), async (req, res, next) => {
    try {
        const data = await serviceCatalogService.upsertMyFreelancerServices(req.db, req.user.id, req.body);
        res.json({ items: data });
    }
    catch (err) {
        next(err);
    }
});
router.get("/freelancers/:id", validate(getFreelancerServicesByUserSchema), async (req, res, next) => {
    try {
        const data = await serviceCatalogService.listFreelancerServicesByUserId(req.db, req.params.id);
        res.json({ items: data });
    }
    catch (err) {
        next(err);
    }
});
router.post("/requests", validate(createServiceRequestSchema), async (req, res, next) => {
    try {
        const data = await serviceCatalogService.createServiceRequest(req.db, req.user.id, req.body);
        res.status(201).json({ data });
    }
    catch (err) {
        next(err);
    }
});
router.get("/requests", validate(listServiceRequestsSchema), async (req, res, next) => {
    try {
        const data = await serviceCatalogService.listServiceRequests(req.db, req.user.id, req.query || {});
        res.json(data);
    }
    catch (err) {
        next(err);
    }
});
router.get("/requests/:id", validate(getServiceRequestSchema), async (req, res, next) => {
    try {
        const data = await serviceCatalogService.getServiceRequestById(req.db, req.params.id, req.user.id);
        res.json({ data });
    }
    catch (err) {
        next(err);
    }
});
router.get("/requests/:id/messages", validate(listServiceRequestMessagesSchema), async (req, res, next) => {
    try {
        const data = await serviceCatalogService.listServiceRequestMessages(req.db, req.params.id, req.user.id, req.query);
        res.json(data);
    }
    catch (err) {
        next(err);
    }
});
router.post("/requests/:id/messages", validate(createServiceRequestMessageSchema), async (req, res, next) => {
    try {
        const data = await serviceCatalogService.createServiceRequestMessage(req.db, req.params.id, req.user.id, req.body);
        res.status(201).json({ data });
    }
    catch (err) {
        next(err);
    }
});
router.post("/requests/:id/messages/read", validate(markServiceRequestMessagesReadSchema), async (req, res, next) => {
    try {
        const data = await serviceCatalogService.markServiceRequestMessagesRead(req.db, req.params.id, req.user.id);
        res.json({ data });
    }
    catch (err) {
        next(err);
    }
});
export default router;
