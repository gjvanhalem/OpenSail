package nl.gzeven.opensail.tcp

import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Test
import java.io.IOException
import java.net.InetAddress
import java.net.ServerSocket
import java.net.Socket
import java.util.concurrent.LinkedBlockingQueue
import java.util.concurrent.TimeUnit

/** The sockets against a local server that plays the autopilot, like desktop/src-tauri/src/tcp.rs's tests */
class TcpSocketsTest {
    sealed class Event {
        data class Data(val id: String, val data: String) : Event()
        data class Closed(val id: String, val error: String?) : Event()
    }

    private val events = LinkedBlockingQueue<Event>()
    private val listener = object : TcpSockets.TcpEvents {
        override fun onData(id: String, data: String) {
            events.add(Event.Data(id, data))
        }

        override fun onClosed(id: String, error: String?) {
            events.add(Event.Closed(id, error))
        }
    }
    private val server = ServerSocket(0, 50, InetAddress.getLoopbackAddress())
    private val port = server.localPort

    @After
    fun tearDown() {
        server.close()
    }

    private fun next(): Event = events.poll(5, TimeUnit.SECONDS) ?: throw AssertionError("no event within 5 s")

    /** The data events up to `length` characters, joined */
    private fun readText(length: Int, from: LinkedBlockingQueue<Event> = events): String {
        val text = StringBuilder()
        while (text.length < length) {
            when (val event = from.poll(5, TimeUnit.SECONDS)) {
                is Event.Data -> text.append(event.data)
                else -> fail("expected data, got $event")
            }
        }
        return text.toString()
    }

    private fun accept(): Socket = server.accept().apply { soTimeout = 5_000 }

    @Test
    fun readsWhatTheAutopilotSendsUntilItCloses() {
        val sockets = TcpSockets(listener)
        sockets.connect("wifi#1", "127.0.0.1", port)
        val peer = accept()

        val sentences = "\$APHDM,123.4,M*3A\r\n\$APRSA,-5.0,A,,V*7B\r\n"
        peer.getOutputStream().write(sentences.toByteArray())
        assertEquals(sentences, readText(sentences.length))

        peer.close()
        assertEquals(Event.Closed("wifi#1", null), next())
        assertFalse(sockets.isOpen("wifi#1"))
    }

    @Test
    fun writesToTheSocket() {
        val sockets = TcpSockets(listener)
        sockets.connect("wifi#1", "127.0.0.1", port)
        val peer = accept()

        sockets.write("wifi#1", "\$GPAPB,test*00\r\n")
        val buffer = ByteArray(16)
        var read = 0
        while (read < buffer.size) read += peer.getInputStream().read(buffer, read, buffer.size - read)
        assertEquals("\$GPAPB,test*00\r\n", String(buffer))
        try {
            sockets.write("other", "x")
            fail("wrote to a socket that isn't open")
        } catch (error: IOException) {
            assertEquals("not connected", error.message)
        }
    }

    @Test
    fun disconnectClosesTheSocketWithoutAnEvent() {
        val sockets = TcpSockets(listener)
        sockets.connect("wifi#1", "127.0.0.1", port)
        val peer = accept()

        sockets.disconnect("wifi#1")
        assertFalse(sockets.isOpen("wifi#1"))
        // The autopilot sees the socket close
        assertEquals(-1, peer.getInputStream().read())
        // The reader was stopped, so it sends nothing more
        assertNull(events.poll(300, TimeUnit.MILLISECONDS))
    }

    @Test
    fun reportsAnAddressWhereNothingListens() {
        val closed = ServerSocket(0, 50, InetAddress.getLoopbackAddress())
        val freePort = closed.localPort
        closed.close()
        val sockets = TcpSockets(listener)
        try {
            sockets.connect("wifi#1", "127.0.0.1", freePort)
            fail("connected to a closed port")
        } catch (error: IOException) {
            assertTrue(error.message!!.isNotEmpty())
        }
        assertFalse(sockets.isOpen("wifi#1"))
    }

    @Test
    fun refusesAnInvalidPort() {
        try {
            TcpSockets(listener).connect("wifi#1", "127.0.0.1", 70000)
            fail("accepted port 70000")
        } catch (error: IOException) {
            assertEquals("invalid port 70000", error.message)
        }
    }

    @Test
    fun keepsSocketsApart() {
        val sockets = TcpSockets(listener)
        val first = LinkedBlockingQueue<Event>()
        val second = LinkedBlockingQueue<Event>()
        val split = TcpSockets(object : TcpSockets.TcpEvents {
            override fun onData(id: String, data: String) {
                (if (id == "a#1") first else second).add(Event.Data(id, data))
            }

            override fun onClosed(id: String, error: String?) {}
        })
        split.connect("a#1", "127.0.0.1", port)
        val peerA = accept()
        split.connect("b#1", "127.0.0.1", port)
        val peerB = accept()

        peerA.getOutputStream().write("\$A*00\r\n".toByteArray())
        peerB.getOutputStream().write("\$B*00\r\n".toByteArray())
        assertEquals("\$A*00\r\n", readText(7, first))
        assertEquals("\$B*00\r\n", readText(7, second))
        sockets.disconnectAll()
        split.disconnectAll()
    }

    @Test
    fun closesASilentLink() {
        val sockets = TcpSockets(listener, readTimeoutMs = 200)
        sockets.connect("wifi#1", "127.0.0.1", port)
        accept()
        assertEquals(Event.Closed("wifi#1", "no data for 0 s"), next())
        assertFalse(sockets.isOpen("wifi#1"))
    }

    @Test
    fun usesTheSocketItIsGiven() {
        var made = 0
        val sockets = TcpSockets(listener)
        sockets.connect("wifi#1", "127.0.0.1", port) { made++; Socket() }
        accept()
        assertEquals(1, made)
        sockets.disconnect("wifi#1")
    }

    @Test
    fun tellsLocalNetworksApart() {
        fun local(address: String) = TcpSockets.isLocalNetwork(InetAddress.getByName(address))
        assertTrue(local("192.168.14.1"))
        assertTrue(local("10.0.2.2"))
        assertTrue(local("172.16.0.5"))
        assertTrue(local("169.254.1.1"))
        assertFalse(local("127.0.0.1"))
        assertFalse(local("140.82.121.4"))
    }
}
