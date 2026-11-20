# Sutura keep-alive

The **Keep Sutura awake** GitHub Actions workflow sends a GET request to
`https://suturagambia.onrender.com/actuator/health/liveness` every twenty minutes (at :03, :23 and :43 each hour).
It also supports **Run workflow** from the Actions tab. No secrets, checkout,
login requests or financial writes are required. The job retries temporary
failures, has a four-minute time limit and checks that the response reports UP.
Liveness is used so the scheduled request does not query Redis or the database.

The workflow must be on the repository's default branch to run on schedule.
Disable it in Actions to stop the pings; update its URL if the backend moves.

This is best-effort: GitHub can delay scheduled jobs, and disables schedules in
public repositories after 60 days without repository activity. Render's free
instance-hours allowance is shared across the workspace; keeping a service
running consumes that allowance. Pings do not guarantee uninterrupted uptime
or stop provider restarts or quota suspension.

Sources: [Render free instances](https://render.com/docs/free) and
[GitHub scheduled events](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule).

This interval exceeds Render's 15-minute idle threshold, so the service can
sleep between scheduled pings.
