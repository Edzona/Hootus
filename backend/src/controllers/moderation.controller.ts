import type { RequestHandler } from 'express';
import { z } from 'zod';
import * as q from '../generated/moderation.queries.js';
import { assertAuthenticated } from '../helpers/auth.js';
import { notFound } from '../helpers/errors.js';
import { pageSchema } from '../helpers/validation.js';
import { ModerationTarget, ReportStatus } from '../types/domain.js';

const hiddenQuery = z.enum(['true', 'false']).transform(value => value === 'true').optional();

export const reportBody = z.strictObject({
  kind: z.enum(ModerationTarget),
  id: z.uuid(),
  reason: z.string().trim().min(1).max(500),
});

export const reportListQuery = pageSchema.extend({
  status: z.enum(ReportStatus).optional(),
});

export const moderationContentQuery = pageSchema.extend({
  kind: z.enum(ModerationTarget),
  hidden: hiddenQuery,
});

export const moderationReportParams = z.strictObject({ id: z.uuid() });
export const moderationContentParams = z.strictObject({
  kind: z.enum(ModerationTarget),
  id: z.uuid(),
});
export const moderationReportBody = z.strictObject({
  status: z.enum([ReportStatus.Resolved, ReportStatus.Dismissed]),
});
export const moderationContentBody = z.strictObject({ hidden: z.boolean() });

export const createReport: RequestHandler = async (req, res) => {
  assertAuthenticated(req);
  const body = res.locals.body as z.infer<typeof reportBody>;
  const [report] = await req.db(tx => q.createContentReport.run({
    targetKind: body.kind, targetId: body.id, reason: body.reason,
  }, tx));
  if (!report) throw notFound('That content is no longer available.');
  res.status(201).json({ data: report });
};

export const getModerationReports: RequestHandler = async (req, res) => {
  assertAuthenticated(req);
  const page = res.locals.query as z.infer<typeof reportListQuery>;
  const data = await req.db(async tx => {
    const rows = await q.getModerationReports.run({
      ...page, status: page.status ?? ReportStatus.Open,
    }, tx);
    return rows.map(report => ({
      id: report.id,
      kind: report.kind,
      target_id: report.target_id,
      target_title: report.target_title,
      target_author: report.target_author_name ? { name: report.target_author_name } : null,
      target_hidden: report.target_hidden,
      reason: report.reason,
      status: report.status,
      created_at: report.created_at,
      resolved_at: report.resolved_at,
    }));
  });
  res.json({ data });
};

export const updateModerationReport: RequestHandler = async (req, res) => {
  assertAuthenticated(req);
  const { id } = res.locals.params as z.infer<typeof moderationReportParams>;
  const { status } = res.locals.body as z.infer<typeof moderationReportBody>;
  const [report] = await req.db(tx => q.updateModerationReport.run({ id, status }, tx));
  if (!report) throw notFound('Open report not found.');
  res.json({ data: report });
};

export const getModerationContent: RequestHandler = async (req, res) => {
  assertAuthenticated(req);
  const query = res.locals.query as z.infer<typeof moderationContentQuery>;
  const data = await req.db(async tx => {
    const rows = await q.getModerationContent.run({
      ...query, hidden: query.hidden ?? null,
    }, tx);
    return rows.map(content => ({
      id: content.id,
      kind: content.kind,
      title: content.title,
      body: content.preview,
      club: content.club_name ? { name: content.club_name } : null,
      author: content.author_name ? { name: content.author_name } : null,
      hidden: content.hidden,
      open_reports: content.open_reports,
      created_at: content.created_at,
    }));
  });
  res.json({ data });
};

export const setContentHidden: RequestHandler = async (req, res) => {
  assertAuthenticated(req);
  const { kind, id } = res.locals.params as z.infer<typeof moderationContentParams>;
  const { hidden } = res.locals.body as z.infer<typeof moderationContentBody>;
  const [content] = await req.db(tx => q.setContentHidden.run({
    targetKind: kind, targetId: id, hidden,
  }, tx));
  if (!content) throw notFound('Content not found.');
  res.json({ data: content });
};

export const deleteContent: RequestHandler = async (req, res) => {
  assertAuthenticated(req);
  const { kind, id } = res.locals.params as z.infer<typeof moderationContentParams>;
  const [content] = await req.db(tx => q.deleteContent.run({ targetKind: kind, targetId: id }, tx));
  if (!content) throw notFound('Content not found.');
  res.json({ data: content });
};
