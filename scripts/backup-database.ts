/**
 * Database Backup Script
 * 
 * Usage:
 * node scripts/backup-database.js
 * 
 * Or add to package.json:
 * "scripts": {
 *   "backup": "tsx scripts/backup-database.ts"
 * }
 */

import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs/promises'
import path from 'path'

const execAsync = promisify(exec)

// Configuration
const BACKUP_DIR = path.join(process.cwd(), 'backups')
const MAX_BACKUPS = 30 // Keep last 30 backups
const DATABASE_URL = process.env.DATABASE_URL

async function ensureBackupDir() {
    try {
        await fs.access(BACKUP_DIR)
    } catch {
        await fs.mkdir(BACKUP_DIR, { recursive: true })
        console.log(`Created backup directory: ${BACKUP_DIR}`)
    }
}

async function createBackup() {
    if (!DATABASE_URL) {
        throw new Error('DATABASE_URL not found in environment variables')
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `backup-${timestamp}.sql`
    const filepath = path.join(BACKUP_DIR, filename)

    console.log(`Creating backup: ${filename}`)

    // For PostgreSQL
    if (DATABASE_URL.includes('postgresql')) {
        try {
            await execAsync(`pg_dump "${DATABASE_URL}" > "${filepath}"`)
            console.log(`✅ Backup created successfully: ${filename}`)
        } catch (error: any) {
            throw new Error(`Backup failed: ${error.message}`)
        }
    }
    // For MySQL
    else if (DATABASE_URL.includes('mysql')) {
        // Parse MySQL connection string
        const match = DATABASE_URL.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/)
        if (!match) throw new Error('Invalid MySQL connection string')

        const [, user, password, host, port, database] = match

        try {
            await execAsync(
                `mysqldump -h ${host} -P ${port} -u ${user} -p${password} ${database} > "${filepath}"`
            )
            console.log(`✅ Backup created successfully: ${filename}`)
        } catch (error: any) {
            throw new Error(`Backup failed: ${error.message}`)
        }
    }
    else {
        throw new Error('Unsupported database type. Only PostgreSQL and MySQL are supported.')
    }

    return filepath
}

async function cleanOldBackups() {
    const files = await fs.readdir(BACKUP_DIR)
    const backupFiles = files
        .filter(f => f.startsWith('backup-') && f.endsWith('.sql'))
        .map(f => ({
            name: f,
            path: path.join(BACKUP_DIR, f)
        }))

    // Sort by name (which includes timestamp)
    backupFiles.sort((a, b) => b.name.localeCompare(a.name))

    // Delete old backups
    if (backupFiles.length > MAX_BACKUPS) {
        const toDelete = backupFiles.slice(MAX_BACKUPS)
        console.log(`\nCleaning ${toDelete.length} old backup(s)...`)

        for (const file of toDelete) {
            await fs.unlink(file.path)
            console.log(`  Deleted: ${file.name}`)
        }
    }

    console.log(`\nTotal backups kept: ${Math.min(backupFiles.length, MAX_BACKUPS)}`)
}

async function getBackupStats() {
    const files = await fs.readdir(BACKUP_DIR)
    const backupFiles = files.filter(f => f.startsWith('backup-') && f.endsWith('.sql'))

    if (backupFiles.length === 0) {
        return null
    }

    backupFiles.sort((a, b) => b.localeCompare(a))
    const latestFile = backupFiles[0]
    const latestPath = path.join(BACKUP_DIR, latestFile)
    const stats = await fs.stat(latestPath)

    return {
        filename: latestFile,
        size: (stats.size / 1024 / 1024).toFixed(2) + ' MB',
        created: stats.mtime,
        totalBackups: backupFiles.length
    }
}

async function main() {
    console.log('🔄 Starting database backup...\n')

    try {
        await ensureBackupDir()
        const backupPath = await createBackup()

        // Get backup stats
        const stats = await fs.stat(backupPath)
        console.log(`   Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`)

        await cleanOldBackups()

        const backupStats = await getBackupStats()
        if (backupStats) {
            console.log('\n📊 Backup Status:')
            console.log(`   Latest: ${backupStats.filename}`)
            console.log(`   Size: ${backupStats.size}`)
            console.log(`   Created: ${backupStats.created.toLocaleString()}`)
            console.log(`   Total Backups: ${backupStats.totalBackups}`)
        }

        console.log('\n✅ Backup completed successfully!')
        process.exit(0)
    } catch (error: any) {
        console.error('\n❌ Backup failed:', error.message)
        process.exit(1)
    }
}

// Run if called directly
if (require.main === module) {
    main()
}

export { createBackup, cleanOldBackups, getBackupStats }
