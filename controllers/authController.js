const bcrypt = require('bcrypt');
const {
    getDb
} = require('../utils/database');

// Render login page
const getLogin = (req, res) => {
    if (req.session.user) {
        return res.redirect('/dashboard');
    }
    res.render('auth/login', {
        title: 'Login',
        error: null
    });
};

// Process login
const postLogin = (req, res) => {
    const {
        username,
        password
    } = req.body;

    if (!username || !password) {
        return res.render('auth/login', {
            title: 'Login',
            error: 'Username dan password harus diisi'
        });
    }

    const db = getDb();

    db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
        if (err) {
            console.error('Database error:', err);
            return res.render('auth/login', {
                title: 'Login',
                error: 'Terjadi kesalahan pada server'
            });
        }

        if (!user) {
            return res.render('auth/login', {
                title: 'Login',
                error: 'Username atau password salah'
            });
        }

        // Compare passwords
        bcrypt.compare(password, user.password, (err, isMatch) => {
            if (err) {
                console.error('Password comparison error:', err);
                return res.render('auth/login', {
                    title: 'Login',
                    error: 'Terjadi kesalahan pada server'
                });
            }

            if (!isMatch) {
                return res.render('auth/login', {
                    title: 'Login',
                    error: 'Username atau password salah'
                });
            }

            // Create session
            req.session.user = {
                id: user.id,
                username: user.username
            };

            res.redirect('/dashboard');
        });
    });
};

// Render change password page
const getChangePassword = (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }

    res.render('auth/change-password', {
        title: 'Ganti Password',
        error: null,
        success: null
    });
};

// Process change password
const postChangePassword = (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }

    const {
        currentPassword,
        newPassword,
        confirmPassword
    } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
        return res.render('auth/change-password', {
            title: 'Ganti Password',
            error: 'Semua field harus diisi',
            success: null
        });
    }

    if (newPassword !== confirmPassword) {
        return res.render('auth/change-password', {
            title: 'Ganti Password',
            error: 'Password baru tidak cocok dengan konfirmasi',
            success: null
        });
    }

    if (newPassword.length < 6) {
        return res.render('auth/change-password', {
            title: 'Ganti Password',
            error: 'Password baru harus minimal 6 karakter',
            success: null
        });
    }

    const db = getDb();

    // Get user from database
    db.get('SELECT * FROM users WHERE id = ?', [req.session.user.id], (err, user) => {
        if (err) {
            console.error('Database error:', err);
            return res.render('auth/change-password', {
                title: 'Ganti Password',
                error: 'Terjadi kesalahan pada server',
                success: null
            });
        }

        if (!user) {
            req.session.destroy();
            return res.redirect('/login');
        }

        // Verify current password
        bcrypt.compare(currentPassword, user.password, (err, isMatch) => {
            if (err) {
                console.error('Password comparison error:', err);
                return res.render('auth/change-password', {
                    title: 'Ganti Password',
                    error: 'Terjadi kesalahan pada server',
                    success: null
                });
            }

            if (!isMatch) {
                return res.render('auth/change-password', {
                    title: 'Ganti Password',
                    error: 'Password saat ini tidak valid',
                    success: null
                });
            }

            // Hash new password
            bcrypt.hash(newPassword, 10, (err, hashedPassword) => {
                if (err) {
                    console.error('Password hashing error:', err);
                    return res.render('auth/change-password', {
                        title: 'Ganti Password',
                        error: 'Terjadi kesalahan pada server',
                        success: null
                    });
                }

                // Update password in database
                db.run('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, user.id], (err) => {
                    if (err) {
                        console.error('Database update error:', err);
                        return res.render('auth/change-password', {
                            title: 'Ganti Password',
                            error: 'Terjadi kesalahan saat memperbarui password',
                            success: null
                        });
                    }

                    return res.render('auth/change-password', {
                        title: 'Ganti Password',
                        error: null,
                        success: 'Password berhasil diubah'
                    });
                });
            });
        });
    });
};

// Logout
const logout = (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Session destruction error:', err);
        }
        res.redirect('/login');
    });
};

module.exports = {
    getLogin,
    postLogin,
    getChangePassword,
    postChangePassword,
    logout
};