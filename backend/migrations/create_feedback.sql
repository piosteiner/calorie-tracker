-- Migration: feedback from visitors (the "F" button). routes/feedback.js also creates it on first use.
CREATE TABLE IF NOT EXISTS feedback (
    id         INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    kind       VARCHAR(10)   NOT NULL,
    message    TEXT          NOT NULL,
    email      VARCHAR(200)  NULL,
    page_url   VARCHAR(500)  NULL,
    page_title VARCHAR(200)  NULL,
    elements   JSON          NULL,
    viewport   VARCHAR(20)   NULL,
    user_id    INT           NULL,
    username   VARCHAR(50)   NULL,
    done       TINYINT(1)    NOT NULL DEFAULT 0,
    created_at TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_feedback_created_at (created_at)
);
