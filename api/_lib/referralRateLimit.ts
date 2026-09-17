import { Redis } from '@upstash/redis'
import { createHash } from 'node:crypto'

function redisConfigured(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL?.trim() &&
      process.env.UPSTASH_REDIS_REST_TOKEN?.trim(),
  )
}

function redis(): Redis {
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!.trim(),
    token: process.env.UPSTASH_REDIS_REST_TOKEN!.trim(),
  })
}

function key(bucket: string, identity: string): string {
  const digest = createHash('sha256').update(`${bucket}:${identity}`).digest('hex')
  return `rewards:rl:${digest}`
}

export async function assertRewardRateLimit(input: {
  bucket: string
  identity: string
  limit: number
  windowSeconds: number
}): Promise<void> {
  if (!redisConfigured()) {
    throw new Error('Rewards protection is not configured.')
  }
  const client = redis()
  const redisKey = key(input.bucket, input.identity)
  const attempts = Number((await client.incr(redisKey)) ?? 0)
  if (attempts === 1) await client.expire(redisKey, input.windowSeconds)
  if (attempts > input.limit) {
    throw new Error('Too many attempts. Try again in a few minutes.')
  }
}
