package nl.gzeven.opensail.tcp

import java.io.IOException
import java.net.InetAddress
import java.net.InetSocketAddress
import java.net.Socket
import java.net.SocketTimeoutException
import java.util.concurrent.ConcurrentHashMap

/**
 * Plain TCP for Wi-Fi instruments, e.g. the NMEA 0183 server of the Pcnautic / pypilot
 * autopilot on 192.168.14.1:20220. A web page can't open TCP sockets, so the page asks Kotlin.
 * The Windows app does the same in Rust (desktop/src-tauri/src/tcp.rs), with the same calls
 * and events.
 *
 * Every chunk read goes to [TcpEvents.onData] (the plugin sends it to the page as `tcp-data`),
 * and [TcpEvents.onClosed] follows when the other side closes the socket, reading fails or
 * nothing arrives for [readTimeoutMs] (`tcp-closed`). The page
 * (pwa/src/services/connections/NativeTcpConnection.ts) splits the chunks into lines and
 * reconnects. Ids come from the page, one per attempt, so it knows a socket's events before
 * [connect] returns.
 *
 * Plain JVM code without Android classes, so the unit tests run against a local server.
 */
class TcpSockets(
    private val events: TcpEvents,
    private val connectTimeoutMs: Int = 5_000,
    /** A silent autopilot means a dead link (the boat's Wi-Fi dropped): close and let the page reconnect */
    private val readTimeoutMs: Int = 30_000,
) {
    interface TcpEvents {
        fun onData(id: String, data: String)
        fun onClosed(id: String, error: String?)
    }

    private val sockets = ConcurrentHashMap<String, Socket>()

    /**
     * Open a socket and read it on its own thread until it closes. Blocks until connected; call
     * it off the main thread. [newSocket] creates the unconnected socket, e.g. one bound to the
     * Wi-Fi network. Throws an [IOException] with a message for the user.
     */
    fun connect(id: String, host: String, port: Int, newSocket: () -> Socket = { Socket() }) {
        if (port !in 1..65535) throw IOException("invalid port $port")
        val socket = newSocket()
        try {
            socket.connect(InetSocketAddress(host, port), connectTimeoutMs)
            socket.tcpNoDelay = true
            socket.keepAlive = true
            socket.soTimeout = readTimeoutMs
        } catch (error: SocketTimeoutException) {
            socket.close()
            throw IOException("no answer within ${connectTimeoutMs / 1000} s", error)
        } catch (error: IOException) {
            socket.close()
            throw IOException(error.message ?: error.javaClass.simpleName, error)
        }
        sockets.put(id, socket)?.close()
        Thread({ read(id, socket) }, "opensail-tcp-$id").apply { isDaemon = true }.start()
    }

    fun write(id: String, data: String) {
        val socket = sockets[id] ?: throw IOException("not connected")
        synchronized(socket) {
            socket.getOutputStream().apply {
                write(data.toByteArray(Charsets.UTF_8))
                flush()
            }
        }
    }

    /** Close a socket. No closed event follows: the page asked for it. */
    fun disconnect(id: String) {
        sockets.remove(id)?.close()
    }

    /** Close everything, e.g. when the app is destroyed. No events follow. */
    fun disconnectAll() {
        for (id in sockets.keys.toList()) disconnect(id)
    }

    fun isOpen(id: String): Boolean = sockets.containsKey(id)

    private fun read(id: String, socket: Socket) {
        val buffer = ByteArray(4096)
        val error: String? = try {
            val input = socket.getInputStream()
            while (true) {
                val n = input.read(buffer)
                if (n < 0) break
                // NMEA is ASCII; anything else must not stop the stream
                if (n > 0) events.onData(id, String(buffer, 0, n, Charsets.UTF_8))
            }
            null
        } catch (_: SocketTimeoutException) {
            "no data for ${readTimeoutMs / 1000} s"
        } catch (error: IOException) {
            error.message ?: error.javaClass.simpleName
        }
        socket.close()
        // Only when the socket wasn't disconnected (or replaced) by the page
        if (sockets.remove(id, socket)) events.onClosed(id, error)
    }

    companion object {
        /**
         * Addresses on the boat's own network (192.168.x.x, 10.x.x.x, 172.16-31.x.x, 169.254.x.x).
         * Those are reached over Wi-Fi, also when Android prefers mobile data because the boat's
         * Wi-Fi has no internet.
         */
        fun isLocalNetwork(address: InetAddress): Boolean =
            !address.isLoopbackAddress && (address.isSiteLocalAddress || address.isLinkLocalAddress)
    }
}
