package nl.gzeven.opensail.background

/**
 * Which alarm notifications should be on screen. The page reports its alarms (showAlarm,
 * clearAlarm); they appear as notifications only while the app isn't in the foreground, where
 * the page's own overlay and siren take over. Plain Kotlin, so the unit tests run on the JVM.
 */
class AlarmBook {
    data class Alarm(val id: String, val title: String, val text: String)

    sealed class Command {
        data class Post(val alarm: Alarm) : Command()
        data class Cancel(val id: String) : Command()
    }

    private val alarms = linkedMapOf<String, Alarm>()
    private val posted = mutableSetOf<String>()
    private var foreground = true

    val hasAlarms: Boolean get() = alarms.isNotEmpty()

    @Synchronized
    fun show(alarm: Alarm): List<Command> {
        alarms[alarm.id] = alarm
        if (foreground) return emptyList()
        posted += alarm.id
        return listOf(Command.Post(alarm))
    }

    @Synchronized
    fun clear(id: String): List<Command> {
        alarms.remove(id) ?: return emptyList()
        return if (posted.remove(id)) listOf(Command.Cancel(id)) else emptyList()
    }

    /** The user silenced the alarms from a notification: take them all down until the page reports them again */
    @Synchronized
    fun silence(): List<Command> {
        val commands = posted.map { Command.Cancel(it) }
        posted.clear()
        alarms.clear()
        return commands
    }

    @Synchronized
    fun setForeground(isForeground: Boolean): List<Command> {
        foreground = isForeground
        return if (isForeground) {
            val commands = posted.map { Command.Cancel(it) }
            posted.clear()
            commands
        } else {
            alarms.values.filter { posted.add(it.id) }.map { Command.Post(it) }
        }
    }
}
