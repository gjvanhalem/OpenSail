package nl.gzeven.opensail;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import nl.gzeven.opensail.background.BackgroundPlugin;
import nl.gzeven.opensail.tcp.TcpPlugin;

/** The web app in pwa/ (built with `npm run build:native`) plus the app's own plugins */
public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(TcpPlugin.class);
        registerPlugin(BackgroundPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
