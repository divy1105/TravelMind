import { relations } from 'drizzle-orm'
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
} from 'drizzle-orm/pg-core'
import { randomUUID } from 'crypto'

// —— Better Auth tables ——

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').default(false).notNull(),
  image: text('image'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
})

export const session = pgTable(
  'session',
  {
    id: text('id').primaryKey(),
    expiresAt: timestamp('expires_at').notNull(),
    token: text('token').notNull().unique(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
  },
  (table) => [index('session_userId_idx').on(table.userId)],
)

export const account = pgTable(
  'account',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at'),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
    scope: text('scope'),
    password: text('password'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index('account_userId_idx').on(table.userId)],
)

export const verification = pgTable(
  'verification',
  {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index('verification_identifier_idx').on(table.identifier)],
)

// —— App domain tables ——

export const profile = pgTable('profile', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  userId: text('user_id')
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: 'cascade' }),
  bio: text('bio'),
  travelStyle: text('travel_style'),
  preferredCurrency: text('preferred_currency').default('USD').notNull(),
  homeCity: text('home_city'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
})

export const trip = pgTable(
  'trip',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    startDate: timestamp('start_date').notNull(),
    endDate: timestamp('end_date').notNull(),
    totalBudget: numeric('total_budget', { precision: 12, scale: 2 }).notNull(),
    currency: text('currency').default('USD').notNull(),
    interests: text('interests').array().notNull().default([]),
    status: text('status').default('draft').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index('trip_userId_idx').on(table.userId)],
)

export const stop = pgTable(
  'stop',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    tripId: text('trip_id')
      .notNull()
      .references(() => trip.id, { onDelete: 'cascade' }),
    city: text('city').notNull(),
    country: text('country'),
    order: integer('order').notNull(),
    arrivalDate: timestamp('arrival_date'),
    departureDate: timestamp('departure_date'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index('stop_tripId_idx').on(table.tripId)],
)

export const hotel = pgTable(
  'hotel',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    stopId: text('stop_id')
      .notNull()
      .references(() => stop.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    address: text('address'),
    checkIn: timestamp('check_in'),
    checkOut: timestamp('check_out'),
    nightlyRate: numeric('nightly_rate', { precision: 12, scale: 2 }),
    nights: integer('nights'),
    notes: text('notes'),
    bookingUrl: text('booking_url'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index('hotel_stopId_idx').on(table.stopId)],
)

export const activity = pgTable(
  'activity',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    stopId: text('stop_id')
      .notNull()
      .references(() => stop.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    category: text('category'),
    cost: numeric('cost', { precision: 12, scale: 2 }),
    startTime: text('start_time'),
    endTime: text('end_time'),
    notes: text('notes'),
    order: integer('order').default(0).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index('activity_stopId_idx').on(table.stopId)],
)

export const budgetLine = pgTable(
  'budget_line',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    tripId: text('trip_id')
      .notNull()
      .references(() => trip.id, { onDelete: 'cascade' }),
    category: text('category').notNull(),
    label: text('label').notNull(),
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
    linkedActivityId: text('linked_activity_id').references(() => activity.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index('budget_line_tripId_idx').on(table.tripId),
    index('budget_line_linkedActivityId_idx').on(table.linkedActivityId),
  ],
)

export const aiGeneration = pgTable(
  'ai_generation',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    tripId: text('trip_id')
      .notNull()
      .references(() => trip.id, { onDelete: 'cascade' }),
    prompt: text('prompt').notNull(),
    rawJson: jsonb('raw_json').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('ai_generation_tripId_idx').on(table.tripId)],
)

// —— Relations ——

export const userRelations = relations(user, ({ one, many }) => ({
  sessions: many(session),
  accounts: many(account),
  profile: one(profile),
  trips: many(trip),
}))

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, { fields: [session.userId], references: [user.id] }),
}))

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, { fields: [account.userId], references: [user.id] }),
}))

export const profileRelations = relations(profile, ({ one }) => ({
  user: one(user, { fields: [profile.userId], references: [user.id] }),
}))

export const tripRelations = relations(trip, ({ one, many }) => ({
  user: one(user, { fields: [trip.userId], references: [user.id] }),
  stops: many(stop),
  aiGenerations: many(aiGeneration),
  budgetLines: many(budgetLine),
}))

export const stopRelations = relations(stop, ({ one, many }) => ({
  trip: one(trip, { fields: [stop.tripId], references: [trip.id] }),
  activities: many(activity),
  hotels: many(hotel),
}))

export const hotelRelations = relations(hotel, ({ one }) => ({
  stop: one(stop, { fields: [hotel.stopId], references: [stop.id] }),
}))

export const activityRelations = relations(activity, ({ one, many }) => ({
  stop: one(stop, { fields: [activity.stopId], references: [stop.id] }),
  budgetLines: many(budgetLine),
}))

export const budgetLineRelations = relations(budgetLine, ({ one }) => ({
  trip: one(trip, { fields: [budgetLine.tripId], references: [trip.id] }),
  linkedActivity: one(activity, {
    fields: [budgetLine.linkedActivityId],
    references: [activity.id],
  }),
}))

export const aiGenerationRelations = relations(aiGeneration, ({ one }) => ({
  trip: one(trip, { fields: [aiGeneration.tripId], references: [trip.id] }),
}))

export const schema = {
  user,
  session,
  account,
  verification,
  profile,
  trip,
  stop,
  hotel,
  activity,
  budgetLine,
  aiGeneration,
  userRelations,
  sessionRelations,
  accountRelations,
  profileRelations,
  tripRelations,
  stopRelations,
  hotelRelations,
  activityRelations,
  budgetLineRelations,
  aiGenerationRelations,
}
