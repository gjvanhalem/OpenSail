package nl.gzeven.opensail.background

import nl.gzeven.opensail.background.AlarmBook.Alarm
import nl.gzeven.opensail.background.AlarmBook.Command.Cancel
import nl.gzeven.opensail.background.AlarmBook.Command.Post
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class AlarmBookTest {
    private val drag = Alarm("anchorDrag", "OpenSail alarm", "Anchor dragging: 62 m from the anchor")
    private val shallow = Alarm("alert-depth", "Shallow water", "Open OpenSail to see the reading")

    @Test
    fun keepsAlarmsOffTheNotificationsWhileTheAppIsOnScreen() {
        val book = AlarmBook()
        assertEquals(emptyList<AlarmBook.Command>(), book.show(drag))
        assertTrue(book.hasAlarms)
    }

    @Test
    fun postsTheAlarmsOnceTheAppLeavesTheScreen() {
        val book = AlarmBook()
        book.show(drag)
        book.show(shallow)
        assertEquals(listOf(Post(drag), Post(shallow)), book.setForeground(false))
        // Raised while away: posted at once
        val moved = drag.copy(text = "Anchor dragging: 80 m from the anchor")
        assertEquals(listOf(Post(moved)), book.show(moved))
    }

    @Test
    fun takesThemDownWhenTheAppComesBack() {
        val book = AlarmBook()
        book.setForeground(false)
        book.show(drag)
        assertEquals(listOf(Cancel("anchorDrag")), book.setForeground(true))
        // Still an alarm: shown again when the app leaves the screen again
        assertEquals(listOf(Post(drag)), book.setForeground(false))
    }

    @Test
    fun clearsAnAlarmWhoseCauseIsGone() {
        val book = AlarmBook()
        book.show(drag)
        assertEquals(emptyList<AlarmBook.Command>(), book.clear("anchorDrag"))
        assertEquals(emptyList<AlarmBook.Command>(), book.setForeground(false))
        book.show(shallow)
        assertEquals(listOf(Cancel("alert-depth")), book.clear("alert-depth"))
        assertEquals(emptyList<AlarmBook.Command>(), book.clear("unknown"))
        assertFalse(book.hasAlarms)
    }

    @Test
    fun silencesEverything() {
        val book = AlarmBook()
        book.setForeground(false)
        book.show(drag)
        book.show(shallow)
        assertEquals(listOf(Cancel("anchorDrag"), Cancel("alert-depth")), book.silence())
        assertFalse(book.hasAlarms)
        assertEquals(emptyList<AlarmBook.Command>(), book.setForeground(false))
    }

    @Test
    fun describesWhatKeepsTheAppRunning() {
        assertEquals("", NavigationService.describe(emptyList()))
        assertEquals("Anchor watch on", NavigationService.describe(listOf("Anchor watch")))
        assertEquals("Anchor watch, Instruments on", NavigationService.describe(listOf("Anchor watch", "Instruments")))
    }
}
