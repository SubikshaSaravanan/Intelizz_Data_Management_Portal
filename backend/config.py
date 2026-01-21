class Config:

    SQLALCHEMY_DATABASE_URI = (
        "postgresql://postgres:subi1234@localhost:5432/otm_invoice"
    )

    SQLALCHEMY_TRACK_MODIFICATIONS = False

    OTM_URL = (
        "https://otmgtm-test-hipro.otmgtm.us-phoenix-1.ocs.oraclecloud.com"
        "/GC3/glog.integration.servlet.WMServlet"
    )

    OTM_DBXML_URL = (
        "https://otmgtm-test-hipro.otmgtm.us-phoenix-1.ocs.oraclecloud.com"
        "/GC3/glog.integration.servlet.DBXMLServlet?command=xmlExport"
    )

    OTM_USERNAME = "INTL.INT01"
    OTM_PASSWORD = "changeme"

    JWT_SECRET = "intelizz-secret-key"
