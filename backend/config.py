import os
 
class Config:
 
    # ================= DATABASE =================
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL",
        "postgresql://postgres:12345@localhost:5432/otm_invoice"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
 
    # ================= OTM XML =================
    
 
    OTM_METADATA_URL = (
        "https://otmgtm-test-volscm499otm.otmgtm.us-ashburn-1.ocs.oraclecloud.com"
        "/logisticsRestApi/resources-int/v2/metadata-catalog/items"
    )
 
    OTM_ITEM_URL = (
        "https://otmgtm-test-volscm499otm.otmgtm.us-ashburn-1.ocs.oraclecloud.com/logisticsRestApi/resources-int/v2/items"
    )
 
    OTM_DBXML_URL = (
        "https://otmgtm-test-hipro.otmgtm.us-phoenix-1.ocs.oraclecloud.com"
        "/GC3/glog.integration.servlet.DBXMLServlet?command=xmlExport"
    )
 
 
  # ================= OTM Order Base =================


    OTM_ORDER_URL = (
    "https://otmgtm-test-volscm499otm.otmgtm.us-ashburn-1.ocs.oraclecloud.com"
    "/logisticsRestApi/resources-int/v2/orderBases"
)

    OTM_BASE_URL = ( "https://otmgtm-test-volscm499otm.otmgtm.us-ashburn-1.ocs.oraclecloud.com" 
    )


    OTM_ORDER_BASE_METADATA_URL = (
        "https://otmgtm-test-volscm499otm.otmgtm.us-ashburn-1.ocs.oraclecloud.com/logisticsRestApi/resources-int/v2/metadata-catalog/orderBases"
    )

    OTM_ORDERRELEASE_METADATA_URL = (
         "https://otmgtm-test-volscm499otm.otmgtm.us-ashburn-1.ocs.oraclecloud.com/logisticsRestApi/resources-int/v2/metadata-catalog/orderReleases"
    )
    OTM_ORDERRELEASE_URL = (
       "https://otmgtm-test-volscm499otm.otmgtm.us-ashburn-1.ocs.oraclecloud.com/logisticsRestApi/resources-int/v2/orderReleases"
    )

    # ================= AUTH =================
    OTM_USERNAME = "SKYMFG/DEMO.INT01"
    OTM_PASSWORD = "Changeme!23"
 
    JWT_SECRET = "intelizz-secret-key"